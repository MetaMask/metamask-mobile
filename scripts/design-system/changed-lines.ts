/**
 * Added line numbers from a `git diff -U0` patch, keyed by repo-relative path.
 */
export type AddedLines = Record<string, number[]>;

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Parse `git diff -U0` output into the lines each file adds.
 * Deletions do not move the new-file counter. `/dev/null` is ignored.
 */
export function parseAddedLines(diff: string): AddedLines {
  const added: AddedLines = {};
  let file: string | undefined;
  let newLine = 0;
  let inHunk = false;

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      file = undefined;
      inHunk = false;
      continue;
    }

    if (line.startsWith('+++ ')) {
      file = pathFromDiffHeader(line.slice(4).trim());
      inHunk = false;
      continue;
    }

    const hunk = HUNK_HEADER.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      inHunk = file !== undefined;
      continue;
    }

    if (!inHunk || file === undefined) {
      continue;
    }

    if (line.startsWith('\\')) {
      continue;
    }

    if (line.startsWith('+')) {
      const lines = added[file] ?? [];
      lines.push(newLine);
      added[file] = lines;
      newLine += 1;
      continue;
    }

    if (line.startsWith('-')) {
      continue;
    }

    newLine += 1;
  }

  return added;
}

function pathFromDiffHeader(headerPath: string): string | undefined {
  let raw = headerPath;
  if (raw.startsWith('"') && raw.endsWith('"')) {
    raw = raw.slice(1, -1).replace(/\\"/g, '"');
  }

  if (raw === '/dev/null') {
    return undefined;
  }

  if (raw.startsWith('b/')) {
    return raw.slice(2);
  }

  return raw;
}
