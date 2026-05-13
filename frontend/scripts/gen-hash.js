#!/usr/bin/env node
/**
 * gen-hash.js — CLI for å generere bcrypt-hash for AUTH_PASSWORD_HASH.
 *
 * Bruk:
 *   yarn gen-hash
 *   (prompter for passord, printer hash)
 *
 * Eller direkte:
 *   node scripts/gen-hash.js "mitt-passord"
 *
 * Backup-verktøy. Foretrukket vei: bruk den innebygde generatoren
 * under Innstillinger i appen (krever REACT_APP_SHOW_ADMIN_TOOLS=true).
 */
const bcrypt = require('bcryptjs');
const readline = require('readline');

async function main() {
  let password = process.argv[2];

  if (!password) {
    password = await prompt('Skriv passord: ', true);
    const confirm = await prompt('Bekreft passord: ', true);
    if (password !== confirm) {
      console.error('\n❌ Passordene matcher ikke');
      process.exit(1);
    }
  }

  if (!password) {
    console.error('❌ Passord kan ikke være tomt');
    process.exit(1);
  }

  console.log('\n⏳ Genererer bcrypt-hash (cost 12)…');
  const hash = await bcrypt.hash(password, 12);

  console.log('\n✅ Ferdig. Lim inn følgende som AUTH_PASSWORD_HASH i Vercel:\n');
  console.log(hash);
  console.log('\n📝 Husk:');
  console.log('   1. Vercel Dashboard → Settings → Environment Variables');
  console.log('   2. Erstatt verdien for AUTH_PASSWORD_HASH');
  console.log('   3. Save → Redeploy');
  console.log('   4. Send det nye passordet til kunde via sikker kanal\n');
}

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      // Skjul tegn på stdin
      const stdin = process.stdin;
      process.stdout.write(question);
      let input = '';
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf-8');
      const onData = (ch) => {
        ch = String(ch);
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (ch === '\u0003') {
          process.exit(1);
        } else if (ch === '\u007f') {
          input = input.slice(0, -1);
        } else {
          input += ch;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (ans) => { rl.close(); resolve(ans); });
    }
  });
}

main().catch((err) => {
  console.error('Feil:', err.message);
  process.exit(1);
});
