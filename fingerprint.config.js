/** @type {import('@expo/fingerprint').Config} */
const config = {
  // Skip certain sources that don't affect native builds
  sourceSkips: [
    'ExpoConfigVersions', // Skip version bumps (don't need native rebuild)
    'ExpoConfigNames',    // Skip app name changes (don't affect native build)
  ],
  
  // Ignore paths that don't affect native builds
  ignorePaths: [
    // E2E and testing files
    'e2e/**/*',
    'wdio/**/*',
    'appwright/**/*',
    
    // Documentation
    'docs/**/*',
    '**/*.md',
    
    // E2E-specific scripts (keep other scripts as they might affect build)
    'scripts/*e2e*',
    
    // CI/CD files that don't affect builds
    '.github/**/*',
    
    // Temporary and cache directories
    'node_modules/**/.cache/**/*',
    '**/.DS_Store',
    '**/*.log',
    
    // Coverage reports
    'tests/coverage/**/*',
    'tests/merged-coverage/**/*',
    
    // Sourcemaps (generated files)
    'sourcemaps/**/*',
  ],
  
  // Enable debug output for troubleshooting
  debug: false,
};

module.exports = config;
