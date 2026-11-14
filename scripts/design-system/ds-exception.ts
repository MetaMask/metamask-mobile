import type { SourceCode } from 'eslint';

const EXCEPTION_COMMENT = /^\s*ds-exception:\s*(.*)$/;

/**
 * Text after `// ds-exception:` when the reason is non-empty.
 * Line comments pass `comment.value`, which does not include the slashes.
 */
export function readExceptionReason(commentValue: string): string | undefined {
  const match = EXCEPTION_COMMENT.exec(commentValue);
  if (match === null) {
    return undefined;
  }

  const reason = match[1].trim();
  return reason.length > 0 ? reason : undefined;
}

/**
 * True when this line has `// ds-exception: <reason>` and the reason is not blank.
 * A block comment does not count. The reason does not cover other lines.
 */
export function lineHasException(sourceCode: SourceCode, line: number): boolean {
  return sourceCode.getAllComments().some((comment) => {
    if (comment.type !== 'Line' || comment.loc?.start.line !== line) {
      return false;
    }

    return readExceptionReason(comment.value) !== undefined;
  });
}
