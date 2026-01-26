/**
 * File Utilities
 *
 * Utility functions for file analysis and categorization
 */

import { APP_CONFIG } from '../config.ts';

/**
 * Identifies critical files from a list of changed files
 */
export function identifyCriticalFiles(files: string[]): string[] {
  const { files: criticalFileNames, keywords, paths } = APP_CONFIG.critical;

  return files.filter((file) => {
    // Check exact file names
    if (criticalFileNames.includes(file)) {
      return true;
    }
    // Check keywords
    for (const keyword of keywords) {
      if (file.includes(keyword)) {
        return true;
      }
    }
    // Check critical paths
    for (const path of paths) {
      if (file.includes(path)) {
        return true;
      }
    }

    return false;
  });
}
