import React, { useEffect, useRef, useState } from 'react';
import './GithubPushModal.css';
import DiffView from './DiffView';
import {
  readStoredPat,
  writeStoredPat,
  clearStoredPat,
  fetchCurrentFile,
  commitTwoStep,
  buildBackupPath,
  backupTimestamp,
} from '../hooks/useGithubSource';

const COMMIT_STAGES = [
  { id: 'backup', label: 'Commit 1 — backup' },
  { id: 'update', label: 'Commit 2 — overskriv original' },
  { id: 'done',   label: 'Ferdig' },
];

function stageIndex(s) {
  return COMMIT_STAGES.findIndex((x) => x.id === s);
}

/**
 * GithubPushModal — diff-basert flyt:
 * 1. Hent remote (GET sha + content). Hvis PAT mangler: spør først.
 * 2. Vis diff (remote → local). Bruker bekrefter med commit-melding.
 * 3. Push: backup → overskriv (commitTwoStep).
 */
export default function GithubPushModal({
  open,
  onClose,
  parsed,
  jsonString,
  onSuccess,
}) {
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [needsPat, setNeedsPat] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [stage, setStage] = useState(null); // null | 'backup' | 'update' | 'done'
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [current, setCurrent] = useState(null); // {sha, text}
  const [result, setResult] = useState(null);
  const firstFieldRef = useRef(null);

  const previewBackupPath = parsed
    ? buildBackupPath(parsed, backupTimestamp())
    : '';

  useEffect(() => {
    if (!open) return;
    const stored = readStoredPat();
    setPat(stored);
    setNeedsPat(!stored);
    setShowPat(false);
    setError(null);
    setStage(null);
    setBusy(false);
    setFetching(false);
    setCurrent(null);
    setResult(null);
    setCommitMsg(parsed?.filename
      ? `Update ${parsed.filename} via KoDo Editor`
      : 'Update via KoDo Editor');
    setTimeout(() => firstFieldRef.current?.focus(), 30);
    // Hvis PAT finnes: hent diff automatisk
    if (stored && parsed) {
      doFetch(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parsed]);

  if (!open || !parsed) return null;

  const doFetch = async (patToUse) => {
    if (!patToUse) return;
    setError(null);
    setFetching(true);
    setCurrent(null);
    try {
      const cur = await fetchCurrentFile({ parsed, pat: patToUse });
      setCurrent(cur);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setFetching(false);
    }
  };

  const handleConfirmPat = () => {
    if (!pat.trim()) return;
    writeStoredPat(pat.trim());
    setNeedsPat(false);
    doFetch(pat.trim());
  };

  const handlePush = async () => {
    if (!current) return;
    setError(null);
    setBusy(true);
    try {
      const res = await commitTwoStep({
        parsed,
        current,
        newJsonString: jsonString,
        commitMessage: commitMsg.trim(),
        pat: pat.trim(),
        onProgress: (s) => setStage(s),
      });
      setResult(res);
      setStage('done');
      onSuccess?.(res);
      // Auto-lukk etter suksess slik at brukeren slipper å trykke X
      setTimeout(() => onClose?.(), 1200);
    } catch (e) {
      setError(e?.message || String(e));
      setStage(null);
    } finally {
      setBusy(false);
    }
  };

  const handleForgetPat = () => {
    clearStoredPat();
    setPat('');
    setNeedsPat(true);
    setCurrent(null);
  };

  const currentIdx = stage ? stageIndex(stage) : -1;
  const noChange = current && current.text === jsonString;
  const canPush = !!current && !!pat.trim() && !!commitMsg.trim() && !busy && !noChange;

  return (
    <div className="gh-overlay" onClick={busy ? undefined : onClose} data-testid="gh-modal">
      <div
        className="gh-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 720 }}
      >
        <header className="gh-header">
          <div>
            <h2 className="gh-title">Lagre til GitHub</h2>
            <p className="gh-subtitle">
              Diff → backup → overskriv. Bruker GitHub Contents API.
            </p>
          </div>
          <button
            className="gh-close"
            onClick={onClose}
            disabled={busy}
            data-testid="gh-close-btn"
            aria-label="Lukk"
          >
            ✕
          </button>
        </header>

        <div className="gh-body">
          {/* Target preview */}
          <dl className="gh-target" data-testid="gh-target">
            <dt>Repo</dt><dd>{parsed.owner}/{parsed.repo}</dd>
            <dt>Branch</dt><dd>{parsed.branch}</dd>
            <dt>Path</dt><dd>{parsed.path}</dd>
            <dt>Backup</dt><dd>{previewBackupPath}</dd>
          </dl>

          {/* PAT — kun synlig når mangler */}
          {needsPat && (
            <div className="gh-row">
              <label className="gh-label" htmlFor="gh-pat">Personal Access Token</label>
              <div className="gh-pat-row">
                <input
                  id="gh-pat"
                  ref={firstFieldRef}
                  type={showPat ? 'text' : 'password'}
                  className="gh-input"
                  placeholder="ghp_… eller github_pat_…"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && pat.trim()) handleConfirmPat(); }}
                  spellCheck={false}
                  autoComplete="off"
                  data-testid="gh-pat-input"
                />
                <button
                  type="button"
                  className="gh-pat-toggle"
                  onClick={() => setShowPat((v) => !v)}
                  data-testid="gh-pat-toggle"
                >
                  {showPat ? 'Skjul' : 'Vis'}
                </button>
              </div>
              <p className="gh-hint">
                Lagres kun i din nettleser (<code>localStorage</code>). Token trenger
                <code> repo</code>-scope (eller fine-grained: Contents → Read &amp; Write
                for målrepoet). Lag en på{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer noopener"
                >github.com/settings/tokens</a>.
              </p>
              <button
                type="button"
                className="gh-fetch-btn"
                onClick={handleConfirmPat}
                disabled={!pat.trim()}
                data-testid="gh-confirm-pat-btn"
              >
                Lagre token og hent diff
              </button>
            </div>
          )}

          {/* Diff (når current er hentet) */}
          {!needsPat && (
            <>
              {fetching && (
                <div className="gh-progress" data-testid="gh-fetching">
                  <div className="gh-progress-step active">
                    <span className="gh-progress-dot" />
                    <span>Henter nåværende fil + sha…</span>
                  </div>
                </div>
              )}

              {!fetching && current && (
                <DiffView
                  before={current.text}
                  after={jsonString}
                />
              )}

              {!fetching && !current && !error && (
                <button
                  type="button"
                  className="gh-fetch-btn"
                  onClick={() => doFetch(pat.trim())}
                  data-testid="gh-fetch-btn"
                >
                  Hent diff fra GitHub
                </button>
              )}

              {!fetching && current && (
                <button
                  type="button"
                  className="gh-fetch-btn"
                  onClick={() => doFetch(pat.trim())}
                  disabled={busy}
                  data-testid="gh-refetch-btn"
                  title="Hent diffen på nytt (hvis remote er endret)"
                >
                  ↻ Hent diff på nytt
                </button>
              )}
            </>
          )}

          {/* Commit-melding */}
          {!needsPat && (
            <div className="gh-row">
              <label className="gh-label" htmlFor="gh-msg">Commit-melding</label>
              <input
                id="gh-msg"
                type="text"
                className="gh-input commit"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                data-testid="gh-commit-msg"
                disabled={busy}
              />
            </div>
          )}

          {/* Push-progress */}
          {stage && (
            <div className="gh-progress" data-testid="gh-progress">
              {COMMIT_STAGES.map((s, i) => {
                const cls =
                  i < currentIdx ? 'done' :
                  i === currentIdx ? 'active' : '';
                return (
                  <div key={s.id} className={`gh-progress-step ${cls}`}>
                    <span className="gh-progress-dot" />
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resultat */}
          {result && (
            <p className="gh-hint" data-testid="gh-result">
              ✓ Backup: <code>{result.backupPath}</code>
              {result.backupCommit && <> ({result.backupCommit.slice(0, 7)})</>}<br />
              ✓ Oppdatert: <code>{parsed.path}</code>
              {result.updateCommit && <> ({result.updateCommit.slice(0, 7)})</>}
            </p>
          )}

          {/* Feil */}
          {error && (
            <div className="gh-error" data-testid="gh-error">
              {error}
            </div>
          )}

          {!needsPat && !busy && !result && (
            <p className="gh-hint">
              PAT lagret lokalt. <button
                type="button"
                onClick={handleForgetPat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit',
                }}
                data-testid="gh-forget-pat"
              >Glem token</button>
            </p>
          )}
        </div>

        <footer className="gh-footer">
          <button
            type="button"
            className="gh-btn-cancel"
            onClick={onClose}
            disabled={busy}
            data-testid="gh-cancel-btn"
          >
            {result ? 'Lukk' : 'Avbryt'}
          </button>
          {!result && !needsPat && (
            <button
              type="button"
              className="gh-btn-confirm"
              onClick={handlePush}
              disabled={!canPush}
              data-testid="gh-confirm-btn"
              title={
                !current ? 'Hent diff først' :
                noChange ? 'Ingen endringer å pushe' :
                'Kjør backup + overskriv'
              }
            >
              {busy ? 'Pusher…' : noChange ? 'Ingen endringer' : 'Lagre til GitHub'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
