const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('APK provenance verifier passes ten tool-boundary regression cases', () => {
  execFileSync('python3', [path.join(__dirname, 'test_apk_provenance.py')], {
    stdio: 'pipe', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
});
