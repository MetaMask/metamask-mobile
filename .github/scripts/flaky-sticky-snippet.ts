/**
 * Snippet matching for Stage 3 sticky comments.
 *
 * The analyzer often reports the enclosing `it(` line while quoting the inner
 * statement (or adds a trailing newline). Findings still have to exist in the
 * file — hallucinated snippets are dropped — but the match is not locked to
 * the reported line.
 */

export type LocatedSnippet = {
  line: number;
  sourceSnippet: string;
};

function stripTrailingNewlines(text: string): string {
  return text.replace(/(?:\r?\n)+$/, '');
}

function stripTrailingWhitespace(line: string): string {
  return line.replace(/\s+$/, '');
}

function snippetLinesFrom(snippet: string): string[] {
  return stripTrailingNewlines(snippet).split(/\r?\n/);
}

function blockMatches(
  sourceLines: string[],
  start: number,
  snippetLines: string[],
): boolean {
  if (start < 0 || start + snippetLines.length > sourceLines.length) {
    return false;
  }
  return snippetLines.every(
    (line, index) =>
      stripTrailingWhitespace(sourceLines[start + index]) ===
      stripTrailingWhitespace(line),
  );
}

function joinSourceBlock(
  sourceLines: string[],
  start: number,
  length: number,
): string {
  return sourceLines.slice(start, start + length).join('\n');
}

/**
 * Locate `snippet` in `source`. Prefers the 1-based `reportedLine` when that
 * slice matches; otherwise scans the file and returns the first hit.
 */
export function locateSnippetInSource(
  source: string,
  snippet: string,
  reportedLine?: number,
): LocatedSnippet | null {
  const snippetLines = snippetLinesFrom(snippet);
  if (
    snippetLines.length === 0 ||
    snippetLines.every((line) => stripTrailingWhitespace(line).length === 0)
  ) {
    return null;
  }

  const sourceLines = source.split(/\r?\n/);

  if (
    reportedLine !== undefined &&
    Number.isInteger(reportedLine) &&
    reportedLine >= 1 &&
    blockMatches(sourceLines, reportedLine - 1, snippetLines)
  ) {
    return {
      line: reportedLine,
      sourceSnippet: joinSourceBlock(
        sourceLines,
        reportedLine - 1,
        snippetLines.length,
      ),
    };
  }

  const lastStart = sourceLines.length - snippetLines.length;
  for (let start = 0; start <= lastStart; start++) {
    if (blockMatches(sourceLines, start, snippetLines)) {
      return {
        line: start + 1,
        sourceSnippet: joinSourceBlock(sourceLines, start, snippetLines.length),
      };
    }
  }

  return null;
}

/** Short quoted preview so CI logs show why a snippet was dropped. */
export function snippetMismatchPreview(
  reported: string,
  actualAtLine: string,
  maxChars = 180,
): string {
  const clip = (value: string): string =>
    value.length > maxChars ? `${value.slice(0, maxChars)}…` : value;
  return `reported=${JSON.stringify(clip(reported))} actual=${JSON.stringify(clip(actualAtLine))}`;
}

export function sourceSliceAtLine(
  source: string,
  reportedLine: number,
  snippetLineCount: number,
): string {
  if (!Number.isInteger(reportedLine) || reportedLine < 1 || snippetLineCount < 1) {
    return '';
  }
  const sourceLines = source.split(/\r?\n/);
  return joinSourceBlock(sourceLines, reportedLine - 1, snippetLineCount);
}
