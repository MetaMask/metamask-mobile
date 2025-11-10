/**
 * Tag Analyzer
 *
 * Analyzes test files for each tag and calculates optimal test splits
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { TagTestInfo } from '../types';

/**
 * Counts test files for each tag
 */
export async function countTestFilesForTags(
  tagList: string[],
  baseDir: string,
): Promise<TagTestInfo[]> {
  const tagInfo: TagTestInfo[] = [];
  const specsDir = join(baseDir, 'e2e', 'specs');

  for (const tag of tagList) {
    try {
      const findCommand = `find "${specsDir}" -type f \\( -name "*.spec.js" -o -name "*.spec.ts" \\) -not -path "*/quarantine/*" -exec grep -l -E "\\b(${tag})\\b" {} \\; | sort -u`;

      const testFiles = execSync(findCommand, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .trim()
        .split('\n')
        .filter((f) => f);

      const recommendedSplits =
        testFiles.length > 0
          ? Math.min(Math.ceil(testFiles.length / 3.5), 5)
          : 0;

      tagInfo.push({
        tag,
        testFiles,
        fileCount: testFiles.length,
        recommendedSplits,
      });
    } catch {
      tagInfo.push({
        tag,
        testFiles: [],
        fileCount: 0,
        recommendedSplits: 0,
      });
    }
  }

  return tagInfo;
}

/**
 * Counts test files for a combined pattern of tags
 */
export async function countTestFilesForCombinedPattern(
  tagPattern: string,
  baseDir: string,
): Promise<string[]> {
  const specsDir = join(baseDir, 'e2e', 'specs');

  try {
    const findCommand = `find "${specsDir}" -type f \\( -name "*.spec.js" -o -name "*.spec.ts" \\) -not -path "*/quarantine/*" -exec grep -l -E "\\b(${tagPattern})\\b" {} \\; | sort -u`;

    const testFiles = execSync(findCommand, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')
      .filter((f) => f);

    return testFiles;
  } catch {
    return [];
  }
}

/**
 * Calculates optimal number of splits for test execution
 */
export function calculateSplitsForActualFiles(testFiles: string[]): number {
  const totalFiles = testFiles.length;
  if (totalFiles === 0) return 0;

  let splits = Math.ceil(totalFiles / 4);
  if (splits > totalFiles / 2) {
    splits = Math.ceil(totalFiles / 2);
  }

  return Math.min(splits, 20);
}
