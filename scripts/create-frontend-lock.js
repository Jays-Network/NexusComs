const { spawnSync } = require('child_process');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

console.log('Generating package-lock.json in:', frontendDir);

const result = spawnSync('npm', ['install', '--package-lock-only'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
});

if (result.status === 0) {
  console.log('Successfully generated frontend/package-lock.json');
} else {
  console.error('Failed to generate lock file, exit code:', result.status);
  process.exit(result.status || 1);
}
