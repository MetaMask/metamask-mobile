/**
 * Minimal single-pass tokenizer for the GFM constructs found in
 * MetaMask Mobile PR bodies and issue comments.
 *
 * Recognised constructs (in precedence order):
 *   1. Fenced code blocks  (``` / ~~~, multi-line)
 *   2. HTML comments       (<!-- … -->, single- or multi-line)
 *   3. ATX headings        (# through ######)
 *   4. GFM task-list items (- [ ] / - [x])
 *   5. Everything else     (text, one token per line)
 *
 * Known limitations (intentional to keep scope small):
 *   • Indented code blocks (4-space) are emitted as `text`.
 *   • Setext headings (underline-style === / ---) are emitted as `text`.
 *   • Inline code spans (`…`) are not tracked; `<!--` inside a backtick
 *     span is still treated as a comment opener.
 *   • A heading that contains an inline `<!-- … -->` produces a `heading`
 *     token (with the comment in `raw`) followed by a separate
 *     `html_comment` token. The heading's `content` field therefore
 *     reflects the text up to the comment marker.
 */

export type TokenKind =
  | 'text'         // paragraph / inline text not matched by the other kinds
  | 'fenced_code'  // ``` / ~~~ block, including both fence-marker lines
  | 'html_comment' // <!-- … --> (single- or multi-line)
  | 'heading'      // ATX heading (# through ######)
  | 'checkbox';    // GFM task-list item: - [ ] or - [x]

export interface Token {
  /** Discriminant for this token. */
  kind: TokenKind;
  /** Verbatim source text, including any delimiters. */
  raw: string;
  /**
   * Useful payload with delimiters stripped:
   * - `heading`      → heading text (e.g. `**Description**`)
   * - `html_comment` → comment body (without `<!--` / `-->`)
   * - `fenced_code`  → code body (without the two fence-marker lines)
   * - `checkbox`     → label text (after `- [x] ` / `- [ ] `)
   * - `text`         → the line text as-is
   */
  content: string;
  /** Heading depth (1–6). Only present on `heading` tokens. */
  level?: number;
  /** `true` when the checkbox is ticked (`[x]`). Only present on `checkbox` tokens. */
  checked?: boolean;
  /** Language hint after the opening fence (e.g. `"gherkin"`). Only present on `fenced_code` tokens. */
  lang?: string;
}

// ─── Internal regexes ────────────────────────────────────────────────────────

// Closing fences must not carry an info string (GFM §4.5).
const RE_FENCE_OPEN  = /^[ \t]*(`{3,}|~{3,})(.*)$/;
const RE_FENCE_CLOSE = /^[ \t]*(`{3,}|~{3,})[ \t]*$/;
const RE_HEADING     = /^(#{1,6})[ \t]+(.+)$/;
const RE_CHECKBOX    = /^[ \t]*-[ \t]*\[([ xX])\][ \t]*(.*)$/;

type ParseState =
  | { tag: 'normal' }
  | { tag: 'fenced'; fenceChar: string; fenceLen: number; lang: string; rawLines: string[] }
  | { tag: 'comment'; rawLines: string[] };

// ─── Core tokenizer ──────────────────────────────────────────────────────────

/**
 * Tokenize a GFM markdown string into a flat array of tokens in source order.
 *
 * HTML comments inside fenced code blocks are treated as literal text and do
 * not trigger comment tokens, so a stray `<!--` in a code example cannot
 * silently drop the PR sections that follow it.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const lines = text.split('\n');
  let state: ParseState = { tag: 'normal' };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, ''); // normalise \r\n → \n
    // ── Inside a fenced code block ─────────────────────────────────────────
    if (state.tag === 'fenced') {
      const close = RE_FENCE_CLOSE.exec(line);
      if (
        close &&
        close[1][0] === state.fenceChar &&
        close[1].length >= state.fenceLen
      ) {
        state.rawLines.push(rawLine);
        tokens.push({
          kind: 'fenced_code',
          raw: state.rawLines.join('\n'),
          content: state.rawLines.slice(1, -1).join('\n'),
          lang: state.lang,
        });
        state = { tag: 'normal' };
      } else {
        state.rawLines.push(rawLine);
      }
    // ── Inside a multi-line HTML comment ───────────────────────────────────
    } else if (state.tag === 'comment') {
      const closeIdx = line.indexOf('-->');
      if (closeIdx !== -1) {
        state.rawLines.push(line.slice(0, closeIdx + 3));
        const raw = state.rawLines.join('\n');
        tokens.push({
          kind: 'html_comment',
          raw,
          // raw starts with '<!--' and ends with '-->'
          content: raw.slice(4, -3).trim(),
        });
        // Re-scan anything on the same line after '-->' — it may contain more
        // comments or non-comment content.
        state = scanLine(line.slice(closeIdx + 3), tokens);
      } else {
        state.rawLines.push(rawLine);
      }
    // ── Normal state ──────────────────────────────────────────────────────
    } else {
      // Fence opener takes precedence over everything else on the line.
      const fenceOpen = RE_FENCE_OPEN.exec(line);
      if (fenceOpen) {
        state = {
          tag: 'fenced',
          fenceChar: fenceOpen[1][0],
          fenceLen: fenceOpen[1].length,
          lang: fenceOpen[2].trim(),
          rawLines: [rawLine],
        };
      } else {
        state = scanLine(line, tokens);
      }
    }
  }

  // Unclosed fence: treat accumulated lines as text so validators can see the
  // content rather than silently treating the section as empty.
  if (state.tag === 'fenced') {
    tokens.push({
      kind: 'text',
      raw: state.rawLines.join('\n'),
      content: state.rawLines.join('\n'),
    });
  }

  // Unclosed HTML comment: silently drop — an unmatched `<!--` outside a code
  // fence is assumed to be an unfilled template placeholder, so consuming it
  // prevents its placeholder text from passing content checks.

  return tokens;
}

/**
 * Scan a single line (or intra-line fragment) for HTML comment markers,
 * emitting heading / checkbox / text / html_comment tokens as they are found.
 *
 * Returns the resulting parse state so callers can assign it directly to the
 * `state` variable — a direct assignment is required so TypeScript's loop-join
 * analysis includes the `comment` variant in the inferred type of `state`.
 * (Assignments through a callback closure are not tracked by TypeScript's CFA
 * for loop-widening purposes, which causes the `comment` variant to be dropped
 * from the union and produces a spurious "types have no overlap" error.)
 *
 * Blank segments (whitespace only) are skipped so that empty lines and
 * empty input do not produce empty text tokens.
 */
function scanLine(
  line: string,
  tokens: Token[],
): ParseState {
  let pos = 0;
  while (pos <= line.length) {
    const commentStart = line.indexOf('<!--', pos);
    if (commentStart === -1) {
      // No (more) comment openers — remaining text is a heading, checkbox, or
      // plain text. Trim leading/trailing whitespace from intra-line fragments
      // so that " ## Heading" (text after a comment) is still recognised as a
      // heading. Skip blank segments to avoid emitting empty text tokens.
      const segment = line.slice(pos).trim();
      if (segment) emitSegment(segment, tokens);
      return { tag: 'normal' };
    }

    // Emit any text (possibly a heading or checkbox) that precedes the opener.
    const before = line.slice(pos, commentStart).trim();
    if (before) emitSegment(before, tokens);

    const commentEnd = line.indexOf('-->', commentStart + 4);
    if (commentEnd !== -1) {
      // Self-contained inline comment — both delimiters on the same line.
      tokens.push({
        kind: 'html_comment',
        raw: line.slice(commentStart, commentEnd + 3),
        content: line.slice(commentStart + 4, commentEnd).trim(),
      });
      pos = commentEnd + 3;
      // Continue the loop — there may be more comments on this line.
    } else {
      // No closer on this line — comment continues across subsequent lines.
      return { tag: 'comment', rawLines: [line.slice(commentStart)] };
    }
  }
  return { tag: 'normal' };
}

/** Classify and emit one non-comment, non-fence segment as heading, checkbox, or text. */
function emitSegment(line: string, tokens: Token[]): void {
  const heading = RE_HEADING.exec(line);
  if (heading) {
    tokens.push({
      kind: 'heading',
      raw: line,
      content: heading[2].trim(),
      level: heading[1].length,
    });
    return;
  }

  const checkbox = RE_CHECKBOX.exec(line);
  if (checkbox) {
    tokens.push({
      kind: 'checkbox',
      raw: line,
      content: checkbox[2].trim(),
      checked: checkbox[1].toLowerCase() === 'x',
    });
    return;
  }

  tokens.push({ kind: 'text', raw: line, content: line });
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Return the tokens belonging to the section introduced by the heading whose
 * `raw` source contains `sectionTitle`. The heading token itself is excluded.
 *
 * A section ends at the next heading of equal or higher level (lower number).
 * Returns `null` when no matching heading is found.
 */
export function sectionTokens(
  tokens: Token[],
  sectionTitle: string,
): Token[] | null {
  const startIdx = tokens.findIndex(
    (t) => t.kind === 'heading' && t.raw.includes(sectionTitle),
  );
  if (startIdx === -1) return null;

  const sectionLevel = tokens[startIdx].level ?? 1;
  const endIdx = tokens.findIndex(
    (t, i) =>
      i > startIdx &&
      t.kind === 'heading' &&
      (t.level ?? 1) <= sectionLevel,
  );

  return endIdx === -1
    ? tokens.slice(startIdx + 1)
    : tokens.slice(startIdx + 1, endIdx);
}

/**
 * Concatenate the `content` of all non-`html_comment` tokens with `\n`.
 *
 * Equivalent to stripping HTML comments then joining the remaining text —
 * which is what every validator needs after extracting its section.
 */
export function visibleText(tokens: Token[]): string {
  return tokens
    .filter((t) => t.kind !== 'html_comment')
    .map((t) => t.content)
    .join('\n');
}
