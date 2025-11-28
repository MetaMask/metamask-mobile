/**
 * List Directory Tool Handler
 *
 * Lists files in a directory to understand module structure
 */

import { join, normalize } from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { ToolInput } from '../../types';

export function handleListDirectory(input: ToolInput, baseDir: string): string {
  const directory = normalize(input.directory as string);

  // Prevent path traversal
  if (directory.includes('..')) {
    return `Invalid directory path: ${directory}`;
  }

  const fullPath = join(baseDir, directory);

  if (!existsSync(fullPath)) {
    return `Directory not found: ${directory}`;
  }

  try {
    const entries = readdirSync(fullPath);
    const files: string[] = [];
    const dirs: string[] = [];

    entries.forEach((entry) => {
      const entryPath = join(fullPath, entry);
      const stats = statSync(entryPath);

      if (stats.isDirectory()) {
        dirs.push(entry + '/');
      } else {
        files.push(entry);
      }
    });

    const sortedDirs = dirs.sort();
    const sortedFiles = files.sort();
    const allEntries = [...sortedDirs, ...sortedFiles];

    return `Directory listing for ${directory} (${
      allEntries.length
    } items):\n\n${allEntries.join('\n')}`;
  } catch (error) {
    return `Error reading directory ${directory}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}
