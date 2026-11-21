const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('APK provenance and release-signing boundaries pass their regression cases', () => {
  for (const file of ['test_apk_provenance.py', 'test_release_signing.py']) {
    execFileSync('python3', [path.join(__dirname, file)], {
      stdio: 'pipe', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });
  }
});
