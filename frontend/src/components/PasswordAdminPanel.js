import React, { useState } from 'react';
import bcrypt from 'bcryptjs';
import toast from 'react-hot-toast';

/**
 * PasswordAdminPanel — innebygde verktøy for å generere/teste auth-secrets.
 *
 * Synlig kun når REACT_APP_SHOW_ADMIN_TOOLS=true.
 *
 * Sikkerhet:
 *  - Hash genereres LOKALT i nettleseren via bcryptjs (cost 12)
 *  - JWT-secret genereres LOKALT via crypto.getRandomValues() (CSPRNG)
 *  - Passordet sendes ALDRI til server
 *  - Resultater ligger kun i komponentens state, ikke i localStorage
 */
export default function PasswordAdminPanel() {
  const enabled = process.env.REACT_APP_SHOW_ADMIN_TOOLS === 'true';
  if (!enabled) return null;

  return (
    <div className="settings-section settings-section-flush" data-testid="password-admin-panel">
      <p className="settings-meta-hint">
        Generer secrets som settes i Vercel Environment Variables.
        Alle verdier produseres lokalt i nettleseren — ingenting sendes til server.
      </p>

      <HashGenerator />
      <JwtSecretGenerator />
    </div>
  );
}

function HashGenerator() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hash, setHash] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setError(null);
    setHash('');
    if (!password) {
      setError('Skriv inn et passord');
      return;
    }
    if (password !== confirm) {
      setError('Passordene matcher ikke');
      return;
    }
    setWorking(true);
    try {
      // Cost 12 ≈ 200-400ms i browser — gir spinner-følelse
      const result = await bcrypt.hash(password, 12);
      setHash(result);
      // Tøm passord-feltene så de ikke henger igjen
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError('Kunne ikke generere hash: ' + err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success('Hash kopiert til clipboard');
    } catch {
      toast.error('Kunne ikke kopiere — marker og kopier manuelt');
    }
  };

  return (
    <div className="pwd-block" data-testid="hash-generator">
      <h4 className="pwd-subtitle">🔐 Generer ny hash</h4>

      <PasswordField
        label="Nytt passord"
        value={password}
        onChange={setPassword}
        show={showPw}
        onToggle={() => setShowPw((v) => !v)}
        testId="hashgen-password-input"
        autoFocus
      />
      <PasswordField
        label="Bekreft passord"
        value={confirm}
        onChange={setConfirm}
        show={showConfirm}
        onToggle={() => setShowConfirm((v) => !v)}
        testId="hashgen-confirm-input"
      />

      {error && (
        <div className="pwd-error" data-testid="hashgen-error">{error}</div>
      )}

      <button
        type="button"
        className="pwd-btn pwd-btn-primary"
        onClick={handleGenerate}
        disabled={working || !password || !confirm}
        data-testid="hashgen-generate-btn"
      >
        {working ? 'Genererer hash…' : 'Generer hash'}
      </button>

      {hash && (
        <div className="pwd-result" data-testid="hashgen-result">
          <div className="pwd-result-label">
            Hash (lim inn som <code>AUTH_PASSWORD_HASH</code> i Vercel):
          </div>
          <textarea
            className="pwd-result-text"
            readOnly
            value={hash}
            rows={2}
            onFocus={(e) => e.target.select()}
            data-testid="hashgen-result-text"
          />
          <div className="pwd-actions-row">
            <button
              type="button"
              className="pwd-btn pwd-btn-secondary"
              onClick={handleCopy}
              data-testid="hashgen-copy-btn"
            >
              📋 Kopier hash
            </button>
          </div>
          <div className="pwd-warning" data-testid="hashgen-warning">
            ⚠️ Lukk dette vinduet når du er ferdig. Hashen ligger ikke noe annet sted.
          </div>
          <ol className="pwd-steps">
            <li>Åpne Vercel Dashboard → Project → Settings → Environment Variables</li>
            <li>Erstatt verdien for <code>AUTH_PASSWORD_HASH</code> med hashen over.
                Sørg for at alle 3 scopes (Production / Preview / Development) er huket av.</li>
            <li>Klikk <strong>Save</strong> → gå til Deployments → klikk … på siste deploy → <strong>Redeploy</strong></li>
            <li>Vent ~90 sek til ny build er live</li>
            <li>Send det nye passordet til kunde via sikker kanal</li>
          </ol>
          <div className="pwd-note">
            <strong>NB:</strong> Når du har limt hashen inn i Vercel og lagret, kan du
            ikke lese den ut igjen — verdien er <code>Sensitive</code>. Mistet passord =
            generer ny hash fra nytt passord og redeploy.
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, testId, autoFocus }) {
  return (
    <>
      <label className="pwd-label">{label}</label>
      <div className="pwd-input-wrap">
        <input
          className="pwd-input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          autoComplete="new-password"
          data-testid={testId}
        />
        <button
          type="button"
          className="pwd-eye"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? 'Skjul passord' : 'Vis passord'}
          title={show ? 'Skjul' : 'Vis'}
          data-testid={`${testId}-eye`}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </>
  );
}


/**
 * JwtSecretGenerator — genererer en kryptografisk sikker tilfeldig hex-streng
 * for AUTH_JWT_SECRET. Bruker crypto.getRandomValues() (CSPRNG) i browseren —
 * samme sikkerhetsnivå som Node sin crypto.randomBytes().
 *
 * Default: 48 bytes → 96 hex-tegn (langt mer enn nødvendig for HS256).
 */
function JwtSecretGenerator() {
  const [secret, setSecret] = useState('');
  const [bytes, setBytes] = useState(48);

  const handleGenerate = () => {
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    const hex = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setSecret(hex);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success('JWT-secret kopiert til clipboard');
    } catch {
      toast.error('Kunne ikke kopiere — marker og kopier manuelt');
    }
  };

  return (
    <div className="pwd-block" data-testid="jwt-secret-generator" style={{ marginTop: 18 }}>
      <h4 className="pwd-subtitle">🔑 Generer JWT-secret</h4>
      <p className="pwd-hint">
        Tilfeldig hex-streng for <code>AUTH_JWT_SECRET</code>.
        Settes én gang — endres bare hvis du vil logge ut alle umiddelbart.
      </p>

      <label className="pwd-label">Lengde (bytes)</label>
      <div className="jwt-len-row">
        {[32, 48, 64].map((n) => (
          <button
            key={n}
            type="button"
            className={`jwt-len-pill ${bytes === n ? 'active' : ''}`}
            onClick={() => setBytes(n)}
            data-testid={`jwt-len-${n}`}
          >
            {n} bytes <span className="jwt-len-hex">({n * 2} hex)</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="pwd-btn pwd-btn-primary"
        onClick={handleGenerate}
        data-testid="jwt-generate-btn"
      >
        {secret ? 'Generer ny' : 'Generer secret'}
      </button>

      {secret && (
        <div className="pwd-result" data-testid="jwt-result">
          <div className="pwd-result-label">
            Lim inn som <code>AUTH_JWT_SECRET</code> i Vercel:
          </div>
          <textarea
            className="pwd-result-text"
            readOnly
            value={secret}
            rows={3}
            onFocus={(e) => e.target.select()}
            data-testid="jwt-result-text"
          />
          <div className="pwd-actions-row">
            <button
              type="button"
              className="pwd-btn pwd-btn-secondary"
              onClick={handleCopy}
              data-testid="jwt-copy-btn"
            >
              📋 Kopier secret
            </button>
          </div>
          <div className="pwd-warning" data-testid="jwt-warning">
            ⚠️ Lukk dette vinduet når du er ferdig. Secreten ligger ikke noe annet sted.
            Hvis du mister den, må alle brukere logge inn på nytt.
          </div>
          <ol className="pwd-steps">
            <li>Vercel Dashboard → Settings → Environment Variables</li>
            <li>Add eller erstatt <code>AUTH_JWT_SECRET</code> med verdien over</li>
            <li>Save → Deployments → Redeploy</li>
            <li>Vent ~90 sek. Eksisterende cookies blir ugyldige hvis du roterte en gammel verdi.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
