#!/usr/bin/env python3
"""Build a drag-and-drop Chrome ZIP: python3 scripts/package.py [git-ref] [output]."""
import json
import subprocess
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

repo = Path(__file__).resolve().parents[1]
ref = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
output = Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/metapeek.zip').resolve()

def read(name):
    return subprocess.check_output(['git', 'show', f'{ref}:{name}'], cwd=repo)

files = ['manifest.json', 'popup.html', 'popup.css', 'popup.js']
# Earlier versions use a bundled font. Keep its files and license together.
if b'fonts/' in read('popup.css'):
    files += subprocess.check_output(
        ['git', 'ls-tree', '-r', '--name-only', ref, 'fonts/'], cwd=repo, text=True
    ).splitlines()
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.writestr(name, read(name))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    manifest = json.loads(archive.read('manifest.json'))
    assert manifest['manifest_version'] == 3
    assert manifest['action']['default_popup'] in archive.namelist()
    assert all(not name.startswith('metapeek/') for name in archive.namelist())
print(f'{output} — version {manifest["version"]}, manifest.json at ZIP root')
