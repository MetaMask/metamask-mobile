/**
 * Git Log Tool Handler
 *
 * Executes git log on specified files to identify recent changes and PRs.
 */

import { execSync } from 'node:child_process';
import { normalize } from 'node:path';
import { ToolInput } from '../../types';

const DEFAULT_MAX_ENTRIES = 20;

export function handleGitLog(input: ToolInput, baseDir: string): string {
  const filePath = normalize(input.file_path as string);
  const maxEntries = input.max_entries || DEFAULT_MAX_ENTRIES;

  // Prevent path traversal
  if (filePath.includes('..')) {
    return `Invalid file path: ${filePath}`;
  }

  try {
    // Use a format that captures hash, author, date, and subject (which often contains PR number)
    const format = '%h|%an|%ad|%s';
    const escapedPath = filePath.replace(/'/g, "'\\''");
    const cmd = `git log --pretty=format:'${format}' --date=short -n ${maxEntries} -- '${escapedPath}'`;

    const output = execSync(cmd, {
      cwd: baseDir,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }).trim();

    if (!output) {
      return `No git history found for: ${filePath}`;
    }

    const lines = output.split('\n');
    const entries = lines.map((line) => {
      const [hash, author, date, ...subjectParts] = line.split('|');
      const subject = subjectParts.join('|');

      // Extract PR number from commit message (e.g., "(#12345)" at end)
      const prMatch = subject.match(/\(#(\d+)\)/);
      const prNumber = prMatch ? `#${prMatch[1]}` : '';

      return { hash, author, date, subject, prNumber };
    });

    const formatted = entries
      .map((e) => {
        const pr = e.prNumber ? ` [${e.prNumber}]` : '';
        return `${e.hash} | ${e.date} | ${e.author} | ${e.subject}${pr}`;
      })
      .join('\n');

    return `Git log for ${filePath} (${entries.length} entries):\n\n${formatted}`;
  } catch (error) {
    return `Error getting git log for ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
  }
}
