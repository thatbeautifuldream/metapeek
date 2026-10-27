#!/usr/bin/env node
// node scripts/package.js [git-ref] [output]
const { execFileSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const ref = process.argv[2] || 'HEAD';
const output = path.resolve(process.argv[3] || path.join(tmpdir(), 'metapeek.zip'));
const read = (name) => execFileSync('git', ['show', `${ref}:${name}`], { cwd: repo });
const files = ['manifest.json', 'popup.html', 'popup.css', 'popup.js'];

// Include bundled fonts and their license when used.
if (read('popup.css').includes('fonts/')) {
  files.push(...execFileSync('git', ['ls-tree', '-r', '--name-only', ref, 'fonts/'], {
    cwd: repo, encoding: 'utf8',
  }).trim().split('\n').filter(Boolean));
}
const manifest = JSON.parse(read('manifest.json'));
if (manifest.manifest_version !== 3 || !files.includes(manifest.action?.default_popup)) {
  throw new Error('Invalid extension manifest');
}

// Stage beside the destination so the final rename is atomic.
mkdirSync(path.dirname(output), { recursive: true });
const staging = mkdtempSync(path.join(path.dirname(output), '.metapeek-'));
try {
  const source = path.join(staging, 'extension');
  mkdirSync(source);
  for (const name of files) {
    const destination = path.join(source, name);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, read(name));
  }
  const archive = path.join(staging, 'metapeek.zip');
  execFileSync('zip', ['-q', archive, ...files], { cwd: source });
  execFileSync('unzip', ['-tq', archive]);
  renameSync(archive, output);
  console.log(`${output} — version ${manifest.version}, manifest.json at ZIP root`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
