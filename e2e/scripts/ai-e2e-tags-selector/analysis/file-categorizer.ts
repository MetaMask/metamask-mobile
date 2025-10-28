/**
 * File Categorizer
 *
 * Categorizes changed files into different types and identifies critical files
 */

import {
  isCriticalFile,
  categorizeFiles as categorizeByCat,
} from '../config/patterns.config';
import { FileCategorization, FileCategories } from '../types';

/**
 * Categorizes a list of files and identifies critical ones
 */
export function categorizeFiles(files: string[]): FileCategorization {
  // Get critical files
  const criticalFiles = files.filter(file => isCriticalFile(file));

  // Categorize all files
  const categorized = categorizeByCat(files);
  const categories: FileCategories = {
    app: categorized.app || [],
    core: categorized.core || [],
    dependencies: categorized.dependencies || [],
    config: categorized.config || [],
    ci: categorized.ci || [],
    tests: categorized.tests || [],
    docs: categorized.docs || [],
    assets: categorized.assets || [],
    other: categorized.other || []
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
