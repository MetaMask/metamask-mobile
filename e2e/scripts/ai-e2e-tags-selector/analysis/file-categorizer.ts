/**
 * File Categorizer
 *
 * Categorizes changed files into different types and identifies critical files.
 * Configuration comes from APP_CONFIG in config.ts
 */

import { FileCategorization, FileCategories } from '../types';
import { APP_CONFIG } from '../config';

/**
 * Check if a file is critical based on configured patterns
 */
export function isCriticalFile(file: string): boolean {
  const { files, keywords, paths } = APP_CONFIG.critical;

  // Check exact file names
  if (files.includes(file)) {
    return true;
  }

  // Check keywords (but exclude test files)
  if (!file.includes('test')) {
    for (const keyword of keywords) {
      if (file.includes(keyword)) {
        return true;
      }
    }
  }

  // Check critical paths
  for (const path of paths) {
    if (file.includes(path) && !file.includes('test')) {
      return true;
    }
  }

  return false;
}

/**
 * Matches a file against category pattern
 */
function matchesPattern(
  file: string,
  pattern: string[] | { extension?: string; paths?: string[]; extensions?: string[]; exclude?: string[] }
): boolean {
  // Handle special object-based patterns
  if (typeof pattern === 'object' && !Array.isArray(pattern)) {
    // Docs: single extension
    if ('extension' in pattern && pattern.extension) {
      return file.endsWith(pattern.extension);
    }

    // Assets: paths or extensions
    if ('paths' in pattern || 'extensions' in pattern) {
      if (pattern.paths?.some(p => file.includes(p))) {
        return true;
      }
      if (pattern.extensions?.some(ext => file.endsWith(ext))) {
        return true;
      }
      return false;
    }

    // App: extensions with exclude
    if ('extensions' in pattern && 'exclude' in pattern) {
      if (pattern.exclude?.some(e => file.includes(e))) {
        return false;
      }
      return pattern.extensions?.some(ext => file.endsWith(ext)) || false;
    }
  }

  // Handle array-based patterns (simple string matching)
  if (Array.isArray(pattern)) {
    return pattern.some(p => file.includes(p));
  }

  return false;
}

/**
 * Get the category for a file based on configured patterns
 */
function getFileCategory(file: string): string {
  const { categories } = APP_CONFIG;

  // Check each category in order (first match wins)
  for (const [category, pattern] of Object.entries(categories)) {
    if (matchesPattern(file, pattern as string[] | { extension?: string; paths?: string[]; extensions?: string[]; exclude?: string[] })) {
      return category;
    }
  }

  return 'other';
}

/**
 * Categorizes a list of files and identifies critical ones
 */
export function categorizeFiles(files: string[]): FileCategorization {
  // Categorize all files
  const categorizedByType: Record<string, string[]> = {
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

  for (const file of files) {
    const category = getFileCategory(file);
    categorizedByType[category].push(file);
  }

  // Get critical files
  const criticalFiles = files.filter(file => isCriticalFile(file));

  const categories: FileCategories = {
    app: categorizedByType.app,
    core: categorizedByType.core,
    dependencies: categorizedByType.dependencies,
    config: categorizedByType.config,
    ci: categorizedByType.ci,
    tests: categorizedByType.tests,
    docs: categorizedByType.docs,
    assets: categorizedByType.assets,
    other: categorizedByType.other
  };

  // Get summary
  const summary: Record<string, number> = {
    app: categories.app.length,
    core: categories.core.length,
    dependencies: categories.dependencies.length,
    config: categories.config.length,
    ci: categories.ci.length,
    tests: categories.tests.length,
    docs: categories.docs.length,
    assets: categories.assets.length,
    other: categories.other.length
  };

  // Check if there are critical changes
  const hasCriticalChanges = criticalFiles.length > 0 || categories.core.length > 0;

  return {
    allFiles: files,
    criticalFiles,
    categories,
    summary,
    hasCriticalChanges
  };
}
