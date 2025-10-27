/**
 * File Pattern Configurations
 *
 * Generic patterns for file categorization and critical file detection.
 * Only specific core/ paths are hardcoded - everything else is generic.
 */

/**
 * Patterns for identifying critical files that require thorough testing
 */
export const CRITICAL_FILE_PATTERNS = {
  // Dependencies
  dependencies: ['package.json', 'yarn.lock', 'package-lock.json'],

  // Only specific core/ files
  core: ['core/Engine', 'core/AppConstants'],

  // Generic pattern: any file with "Controller" in the name (not in tests)
  controllers: (file: string) => file.includes('Controller') && !file.includes('test')
};

/**
 * Check if a file is critical based on configured patterns
 */
export function isCriticalFile(file: string): boolean {
  // Check dependencies
  if (CRITICAL_FILE_PATTERNS.dependencies.includes(file)) {
    return true;
  }

  // Check specific core/ files
  for (const pattern of CRITICAL_FILE_PATTERNS.core) {
    if (file.includes(pattern)) {
      return true;
    }
  }

  // Check generic controller pattern
  if (CRITICAL_FILE_PATTERNS.controllers(file)) {
    return true;
  }

  return false;
}

export const FILE_CATEGORY_PATTERNS: Record<string, (file: string) => boolean> = {
  dependencies: (file: string) =>
    file.includes('lock') ||
    file === 'package.json',

  core: (file: string) =>
    (file.includes('core/') && !file.includes('test')) ||
    file.includes('Controller'),

  config: (file: string) =>
    file.includes('config') ||
    file.includes('tsconfig') ||
    file.includes('babel') ||
    file.includes('metro') ||
    file.includes('webpack') ||
    file.includes('eslint') ||
    file.includes('jest'),

  ci: (file: string) =>
    file.includes('.github') ||
    file.includes('bitrise') ||
    file.includes('workflow') ||
    file.includes('action.yml'),

  tests: (file: string) =>
    file.includes('test') ||
    file.includes('spec') ||
    file.includes('__tests__'),

  docs: (file: string) =>
    file.endsWith('.md'),

  assets: (file: string) =>
    file.includes('/images/') ||
    file.includes('/fonts/') ||
    file.includes('/assets/') ||
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/.test(file),

  app: (file: string) =>
    !file.includes('node_modules') &&
    (file.endsWith('.ts') ||
     file.endsWith('.tsx') ||
     file.endsWith('.js') ||
     file.endsWith('.jsx'))
};

export function getFileCategory(file: string): string {
  for (const [category, matcher] of Object.entries(FILE_CATEGORY_PATTERNS)) {
    if (matcher(file)) {
      return category;
    }
  }
  return 'other';
}

/**
 * Gets the category name for a file
 * Returns 'other' if no category matches
 */
export function categorizeFiles(files: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    app: [],
    core: [],
    dependencies: [],
    config: [],
    ci: [],
    tests: [],
    docs: [],
    assets: [],
    other: []
  };

  const categorized = new Set<string>();

  for (const file of files) {
    for (const [category, matcher] of Object.entries(FILE_CATEGORY_PATTERNS)) {
      if (matcher(file)) {
        categories[category].push(file);
        categorized.add(file);
        break; // Stop after first match to avoid multiple categories
      }
    }
  }

  categories.other = files.filter(f => !categorized.has(f));

  return categories;
}

export function getCategorySummary(categories: Record<string, string[]>): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const [category, files] of Object.entries(categories)) {
    summary[category] = files.length;
  }

  return summary;
}
