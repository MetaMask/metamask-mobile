const { execSync } = require('child_process');

/**
 * Simple git utilities - no overcomplication
 */

/**
 * Get changed files from current PR using gh CLI
 */
function getPRChangedFiles() {
  try {
    // Check if gh CLI is installed
    execSync('gh --version', { encoding: 'utf8', stdio: 'pipe' });

    // Get changed files from the current PR
    const output = execSync('gh pr view --json files --jq ".files[].path"', {
      encoding: 'utf8',
      cwd: process.cwd()
    });

    return output
      .split('\n')
      .filter(Boolean)
      .filter(file => /\.(ts|tsx|js|jsx)$/.test(file))
      .filter(file => !file.includes('.test.'));

  } catch (error) {
    if (error.message.includes('gh: command not found')) {
      console.error('❌ GitHub CLI (gh) is required for PR analysis.');
      console.error('   Install with: brew install gh (macOS) or visit https://cli.github.com');
    } else {
      console.error('❌ Unable to get PR files. Ensure you are in a PR branch and GitHub CLI is configured.');
      console.error('   Run: gh auth login');
    }
    process.exit(1);
  }
}

/**
 * Check if file has test
 */
function hasTestFile(file) {
  const fs = require('fs');
  const testFile = file.replace(/\.(ts|tsx)$/, '.test.$1');
  return fs.existsSync(testFile);
}

module.exports = {
  getPRChangedFiles,
  hasTestFile
};
