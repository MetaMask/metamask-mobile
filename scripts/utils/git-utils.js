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
    if (error.message.includes('gh: command not found') || error.message.includes('gh --version')) {
      console.warn('⚠️  GitHub CLI (gh) not found. Install with: brew install gh');
      console.log('Falling back to git diff...');
    } else {
      console.log('Not in a PR or gh CLI issue, using git diff...');
    }

    // Fallback to git diff
    const output = execSync('git diff --name-only HEAD~3...HEAD', {
      encoding: 'utf8',
      cwd: process.cwd()
    });

    return output
      .split('\n')
      .filter(Boolean)
      .filter(file => /\.(ts|tsx|js|jsx)$/.test(file))
      .filter(file => !file.includes('.test.'));
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
