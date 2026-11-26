/** Host Klipy serves GIF files from. social-api allowlists this domain in comment text. */
export const KLIPY_STATIC_GIF_HOST = 'static.klipy.com';

/**
 * Example file URL from the KLIPY search/trending payload (`file.md.gif.url`).
 * Page URLs like `klipy.com/gifs/...` are not the media the feed renders.
 */
export const KLIPY_STATIC_GIF_EXAMPLE =
  'https://static.klipy.com/ii/935d7ab9d8c6202580a668421940ec81/14/af/um0L4dFH.gif';

const KLIPY_GIF_PREFIX = 'https://static.klipy.com/';
const GIF_EXTENSION = '.gif';
const URL_TERMINATOR = /[\s<>"']/;
const KLIPY_PATH_CONTINUATION = /[a-z0-9_/-]/i;

const isPathContinuationAfterGif = (
  text: string,
  index: number,
  runEnd: number,
): boolean => {
  if (index >= runEnd) {
    return false;
  }
  if (KLIPY_PATH_CONTINUATION.test(text[index])) {
    return true;
  }
  return (
    text[index] === '.' &&
    index + 1 < runEnd &&
    KLIPY_PATH_CONTINUATION.test(text[index + 1])
  );
};

const asciiLowerCode = (code: number): number =>
  code >= 65 && code <= 90 ? code + 32 : code;

const regionEqualsIgnoreCase = (
  text: string,
  index: number,
  expected: string,
): boolean => {
  if (index + expected.length > text.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i++) {
    if (asciiLowerCode(text.charCodeAt(index + i)) !== expected.charCodeAt(i)) {
      return false;
    }
  }
  return true;
};

const indexOfIgnoreCase = (
  text: string,
  expected: string,
  from: number,
  end = text.length,
): number => {
  const last = Math.min(end, text.length) - expected.length;
  for (let index = from; index <= last; index++) {
    if (regionEqualsIgnoreCase(text, index, expected)) {
      return index;
    }
  }
  return -1;
};

const allowedRunEnd = (text: string, index: number): number => {
  let end = index;
  while (end < text.length && !URL_TERMINATOR.test(text[end])) {
    end++;
  }
  return end;
};

const isWhitespaceChar = (char: string): boolean => /\s/.test(char);

interface KlipyGifSpan {
  start: number;
  end: number;
}

/**
 * Linear-time scan for `https://static.klipy.com/...gif(?query)` spans.
 * Avoids quadratic regex backtracking on repeated prefix strings.
 */
const findKlipyGifSpans = (text: string): KlipyGifSpan[] => {
  const spans: KlipyGifSpan[] = [];
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const start = indexOfIgnoreCase(text, KLIPY_GIF_PREFIX, searchFrom);
    if (start < 0) {
      break;
    }

    if (start > 0 && !isWhitespaceChar(text[start - 1])) {
      searchFrom = start + KLIPY_GIF_PREFIX.length;
      continue;
    }

    const afterPrefix = start + KLIPY_GIF_PREFIX.length;
    const runEnd = allowedRunEnd(text, afterPrefix);
    const gifAt = indexOfIgnoreCase(
      text,
      GIF_EXTENSION,
      afterPrefix + 1,
      runEnd,
    );
    if (gifAt < 0) {
      searchFrom = runEnd > afterPrefix ? runEnd : start + 1;
      continue;
    }

    let matchEnd = gifAt + GIF_EXTENSION.length;
    if (text[matchEnd] === '?') {
      matchEnd = allowedRunEnd(text, matchEnd + 1);
    } else if (isPathContinuationAfterGif(text, matchEnd, runEnd)) {
      searchFrom = runEnd;
      continue;
    }

    spans.push({ start, end: matchEnd });
    searchFrom = matchEnd;
  }

  return spans;
};

export const isKlipyStaticGifUrl = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' &&
      url.hostname.toLowerCase() === KLIPY_STATIC_GIF_HOST &&
      url.pathname.toLowerCase().endsWith('.gif')
    );
  } catch {
    return false;
  }
};

/**
 * Puts the GIF file URL in `commentText` so `POST /swap-comments` can persist
 * it. Caption first, URL on its own line; GIF-only posts are just the URL.
 */
export const appendKlipyGifUrlToCommentText = (
  commentText: string,
  gifUrl: string | null | undefined,
): string => {
  const caption = commentText.trim();
  const gif = gifUrl?.trim() ?? '';
  if (!gif || !isKlipyStaticGifUrl(gif)) {
    return caption;
  }
  if (!caption) {
    return gif;
  }
  return `${caption}\n${gif}`;
};

export const splitKlipyGifFromCommentText = (
  commentText: string,
): { text: string; gifUrl?: string } => {
  const trimmed = commentText.trim();
  const last = findKlipyGifSpans(trimmed).at(-1);
  if (!last) {
    return { text: trimmed };
  }

  const gifUrl = trimmed.slice(last.start, last.end);
  if (!isKlipyStaticGifUrl(gifUrl)) {
    return { text: trimmed };
  }

  const before = trimmed.slice(0, last.start).trimEnd();
  const after = trimmed.slice(last.end).trimStart();
  const text = before && after ? `${before} ${after}` : `${before}${after}`;
  return { text: text.trim(), gifUrl };
};

/**
 * Removes all Klipy static GIF file URLs from translated comment text,
 * including duplicate URLs or URLs followed by trailing punctuation.
 */
export const stripKlipyGifUrls = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }
  const spans = findKlipyGifSpans(value).filter((span) =>
    isKlipyStaticGifUrl(value.slice(span.start, span.end)),
  );
  if (spans.length === 0) {
    return value.trim();
  }

  const parts: string[] = [];
  let cursor = 0;

  for (const span of spans) {
    let removeStart = span.start;
    while (removeStart > cursor && isWhitespaceChar(value[removeStart - 1])) {
      removeStart--;
    }
    if (removeStart > cursor) {
      parts.push(value.slice(cursor, removeStart));
    }
    cursor = span.end;
  }

  if (cursor < value.length) {
    parts.push(value.slice(cursor));
  }

  return parts.join('').trim();
};
