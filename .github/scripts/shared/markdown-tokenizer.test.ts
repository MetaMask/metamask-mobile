import {
  tokenize,
  sectionTokens,
  visibleText,
  Token,
  TokenKind,
} from './markdown-tokenizer';

// Convenience: pull just the token kinds from an array.
const kinds = (tokens: Token[]): TokenKind[] => tokens.map((t) => t.kind);

// ─── tokenize ────────────────────────────────────────────────────────────────

describe('tokenize — basics', () => {
  it('returns an empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('emits one text token per plain-text line', () => {
    const result = tokenize('hello\nworld');
    expect(kinds(result)).toEqual(['text', 'text']);
    expect(result[0].content).toBe('hello');
    expect(result[1].content).toBe('world');
  });

  it('raw equals the verbatim source for a text line', () => {
    const [token] = tokenize('some line');
    expect(token.raw).toBe('some line');
  });
});

// ─── tokenize — headings ─────────────────────────────────────────────────────

describe('tokenize — headings', () => {
  it('emits a heading token with level and content', () => {
    const [token] = tokenize('## **Description**');
    expect(token.kind).toBe('heading');
    expect(token.level).toBe(2);
    expect(token.content).toBe('**Description**');
    expect(token.raw).toBe('## **Description**');
  });

  it('emits headings for every ATX level', () => {
    const result = tokenize('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6');
    expect(result.every((t) => t.kind === 'heading')).toBe(true);
    expect(result.map((t) => t.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('does not emit a heading for lines with no space after #', () => {
    // "#no-space" is a valid paragraph in GFM, not a heading.
    const [token] = tokenize('#no-space');
    expect(token.kind).toBe('text');
  });

  it('emits the PR template heading format correctly', () => {
    const result = tokenize(
      '## **Description**\n## **Changelog**\n## **Related issues**',
    );
    expect(result.every((t) => t.kind === 'heading')).toBe(true);
    expect(result.map((t) => t.content)).toEqual([
      '**Description**',
      '**Changelog**',
      '**Related issues**',
    ]);
  });
});

// ─── tokenize — checkboxes ───────────────────────────────────────────────────

describe('tokenize — checkboxes', () => {
  it('emits an unchecked checkbox token', () => {
    const [token] = tokenize('- [ ] Do the thing');
    expect(token.kind).toBe('checkbox');
    expect(token.checked).toBe(false);
    expect(token.content).toBe('Do the thing');
  });

  it('emits a checked checkbox token for [x]', () => {
    const [token] = tokenize('- [x] Done');
    expect(token.kind).toBe('checkbox');
    expect(token.checked).toBe(true);
    expect(token.content).toBe('Done');
  });

  it('treats [X] (uppercase) as checked', () => {
    const [token] = tokenize('- [X] Done');
    expect(token.kind).toBe('checkbox');
    expect(token.checked).toBe(true);
  });

  it('handles leading whitespace before the dash', () => {
    const [token] = tokenize('  - [x] Indented');
    expect(token.kind).toBe('checkbox');
    expect(token.content).toBe('Indented');
  });

  it('emits checkboxes and plain text lines interspersed correctly', () => {
    const result = tokenize('- [x] First\nNot a box\n- [ ] Second');
    expect(kinds(result)).toEqual(['checkbox', 'text', 'checkbox']);
  });
});

// ─── tokenize — fenced code blocks ───────────────────────────────────────────

describe('tokenize — fenced code blocks', () => {
  it('emits a fenced_code token with lang and body content', () => {
    const src = '```gherkin\nFeature: x\n```';
    const [token] = tokenize(src);
    expect(token.kind).toBe('fenced_code');
    expect(token.lang).toBe('gherkin');
    expect(token.content).toBe('Feature: x');
    expect(token.raw).toBe(src);
  });

  it('handles a fenced block without a language hint', () => {
    const [token] = tokenize('```\ncode here\n```');
    expect(token.kind).toBe('fenced_code');
    expect(token.lang).toBe('');
    expect(token.content).toBe('code here');
  });

  it('handles tilde-fence blocks identically to backtick fences', () => {
    const [token] = tokenize('~~~sh\necho hi\n~~~');
    expect(token.kind).toBe('fenced_code');
    expect(token.lang).toBe('sh');
    expect(token.content).toBe('echo hi');
  });

  it('requires the closing fence to be at least as long as the opening fence', () => {
    // A shorter close (`` ` ``) does not close a four-backtick fence.
    const result = tokenize('````\ncode\n```\nstill code\n````');
    expect(kinds(result)).toEqual(['fenced_code']);
    expect(result[0].content).toBe('code\n```\nstill code');
  });

  it('preserves multi-line code body', () => {
    const [token] = tokenize('```\nline one\nline two\n```');
    expect(token.content).toBe('line one\nline two');
  });

  it('does NOT emit html_comment tokens for <!-- --> inside a fenced block', () => {
    const result = tokenize('```html\n<!-- comment -->\n```');
    expect(kinds(result)).toEqual(['fenced_code']);
    expect(result[0].content).toContain('<!-- comment -->');
  });

  it('preserves content that follows a fenced block whose interior has an unclosed <!--', () => {
    // This is the key regression case: a `<!--` inside a Gherkin block must
    // not silently consume the PR sections that follow the code block.
    const src = 'before\n```\n<!-- unclosed\n```\nafter';
    const result = tokenize(src);
    const textContent = result
      .filter((t) => t.kind !== 'html_comment')
      .map((t) => t.content)
      .join('\n');
    expect(textContent).toContain('before');
    expect(textContent).toContain('after');
  });

  it('emits the fenced block as a text token when the closing fence is missing', () => {
    // Unclosed fence: content must still be visible to validators.
    const result = tokenize('before\n```\norphan code');
    expect(kinds(result)).toContain('text');
    const all = result.map((t) => t.content).join('\n');
    expect(all).toContain('orphan code');
  });

  it('tokenizes content before and after a fenced block correctly', () => {
    const src = 'before\n```\ncode\n```\nafter';
    const result = tokenize(src);
    expect(kinds(result)).toEqual(['text', 'fenced_code', 'text']);
    expect(result[0].content).toBe('before');
    expect(result[2].content).toBe('after');
  });
});

// ─── tokenize — HTML comments ────────────────────────────────────────────────

describe('tokenize — HTML comments', () => {
  it('emits a single-line html_comment token', () => {
    const [token] = tokenize('<!-- placeholder -->');
    expect(token.kind).toBe('html_comment');
    expect(token.content).toBe('placeholder');
    expect(token.raw).toBe('<!-- placeholder -->');
  });

  it('emits a multi-line html_comment token', () => {
    const src = '<!--\nfill me in\n-->';
    const [token] = tokenize(src);
    expect(token.kind).toBe('html_comment');
    expect(token.content).toBe('fill me in');
  });

  it('emits text, then comment, then text for an inline comment', () => {
    const result = tokenize('before <!-- note --> after');
    expect(kinds(result)).toEqual(['text', 'html_comment', 'text']);
    // Intra-line fragments are trimmed before classification.
    expect(result[0].content).toBe('before');
    expect(result[1].content).toBe('note');
    expect(result[2].content).toBe('after');
  });

  it('handles multiple comments on a single line', () => {
    const result = tokenize('<!-- a --> text <!-- b -->');
    expect(kinds(result)).toEqual(['html_comment', 'text', 'html_comment']);
  });

  it('consumes an unclosed <!-- and everything after it (outside a fence)', () => {
    // Unclosed openers outside code fences behave like the existing
    // stripHtmlComments: content from the opener onward is dropped so that
    // unfilled template placeholders do not falsely pass content checks.
    const src = 'before\n<!-- unclosed\nafter';
    const result = tokenize(src);
    const content = result.map((t) => t.content).join('\n');
    expect(content).toContain('before');
    // 'after' lands inside the unclosed comment → dropped
    expect(content).not.toContain('after');
  });

  it('emits a heading token even when it is preceded by a comment on the same line', () => {
    // '<!-- note --> ## Heading' — rare in real templates but should work
    const result = tokenize('<!-- note --> ## Heading');
    const headings = result.filter((t) => t.kind === 'heading');
    expect(headings).toHaveLength(1);
    expect(headings[0].content).toBe('Heading');
  });
});

// ─── tokenize — mixed document ────────────────────────────────────────────────

describe('tokenize — mixed document', () => {
  it('tokenizes a realistic PR body fragment correctly', () => {
    const body = [
      '## **Description**',
      '',
      '<!-- describe your changes here -->',
      '',
      'Actual description here.',
      '',
      '## **Pre-merge author checklist**',
      '',
      '- [x] First item',
      '- [ ] Second item',
    ].join('\n');

    const result = tokenize(body);

    const headings  = result.filter((t) => t.kind === 'heading');
    const comments  = result.filter((t) => t.kind === 'html_comment');
    const checkboxes = result.filter((t) => t.kind === 'checkbox');

    expect(headings).toHaveLength(2);
    expect(headings[0].content).toBe('**Description**');
    expect(headings[1].content).toBe('**Pre-merge author checklist**');

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe('describe your changes here');

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
  });
});

// ─── sectionTokens ────────────────────────────────────────────────────────────

describe('sectionTokens', () => {
  const body = [
    '## **Description**',
    '',
    'Description content.',
    '',
    '## **Changelog**',
    '',
    'CHANGELOG entry: x.',
    '',
    '### **Sub-section**',
    '',
    'Sub content.',
    '',
    '## **Related issues**',
    '',
    'Refs: #1',
  ].join('\n');

  const tokens = tokenize(body);

  it('returns tokens between the matched heading and the next same-level heading', () => {
    const section = sectionTokens(tokens, '## **Description**');
    expect(section).not.toBeNull();
    const text = visibleText(section!);
    expect(text).toContain('Description content');
    expect(text).not.toContain('CHANGELOG');
  });

  it('includes lower-level (deeper) headings within the section', () => {
    // ## **Changelog** section ends only at the next ##, not at ###
    const section = sectionTokens(tokens, '## **Changelog**');
    expect(section).not.toBeNull();
    const text = visibleText(section!);
    expect(text).toContain('Sub content');
    expect(text).not.toContain('Refs:');
  });

  it('returns tokens to end of document when no following heading of same level exists', () => {
    const section = sectionTokens(tokens, '## **Related issues**');
    expect(section).not.toBeNull();
    expect(visibleText(section!)).toContain('Refs: #1');
  });

  it('returns null when the heading is not found', () => {
    expect(sectionTokens(tokens, '## **Nonexistent**')).toBeNull();
  });

  it('returns an empty array when the section contains no tokens', () => {
    const minTokens = tokenize('## **A**\n## **B**');
    const section = sectionTokens(minTokens, '## **A**');
    expect(section).toEqual([]);
  });

  it('does not count a heading inside a fenced block as a section boundary', () => {
    const src = [
      '## **Description**',
      '',
      '```',
      '## Not a real heading',
      '```',
      '',
      'Real content.',
      '',
      '## **Changelog**',
    ].join('\n');

    const ts = tokenize(src);
    const section = sectionTokens(ts, '## **Description**');
    expect(section).not.toBeNull();
    expect(visibleText(section!)).toContain('Real content');
    expect(visibleText(section!)).not.toContain('Changelog');
  });

  it('excludes the matched heading token itself', () => {
    const section = sectionTokens(tokens, '## **Description**');
    expect(section).not.toBeNull();
    const headingTokens = section!.filter(
      (t) => t.kind === 'heading' && t.raw.includes('## **Description**'),
    );
    expect(headingTokens).toHaveLength(0);
  });
});

// ─── visibleText ─────────────────────────────────────────────────────────────

describe('visibleText', () => {
  it('returns empty string for an empty token array', () => {
    expect(visibleText([])).toBe('');
  });

  it('joins text token content with newlines', () => {
    const tokens = tokenize('line one\nline two');
    expect(visibleText(tokens)).toBe('line one\nline two');
  });

  it('excludes html_comment content', () => {
    const tokens = tokenize('before\n<!-- hidden -->\nafter');
    const result = visibleText(tokens);
    expect(result).toContain('before');
    expect(result).toContain('after');
    expect(result).not.toContain('hidden');
  });

  it('includes fenced_code body content', () => {
    const tokens = tokenize('```gherkin\nFeature: x\n```');
    expect(visibleText(tokens)).toContain('Feature: x');
  });

  it('includes heading and checkbox content', () => {
    const tokens = tokenize('## **H**\n- [x] Item');
    const text = visibleText(tokens);
    expect(text).toContain('**H**');
    expect(text).toContain('Item');
  });

  it('returns only visible lines when comments are interspersed', () => {
    const tokens = tokenize(
      '<!-- A -->\nvisible one\n<!-- B -->\nvisible two',
    );
    const result = visibleText(tokens);
    expect(result).not.toContain('A');
    expect(result).not.toContain('B');
    expect(result).toContain('visible one');
    expect(result).toContain('visible two');
  });
});
