import {
  locateSnippetInSource,
  snippetMismatchPreview,
  sourceSliceAtLine,
} from './flaky-sticky-snippet';

const SOURCE = [
  "describe('loadOwners', () => {",
  "  it('parses a valid owners file', () => {",
  '    expect(true).toBe(true);',
  '  });',
  '',
  '  // [mcwp-474-tmp]',
  "  it('waits with a real timer', async () => {",
  '    await new Promise((r) => setTimeout(r, 50));',
  '    expect(true).toBe(true);',
  '  });',
  '});',
  '',
].join('\n');

describe('locateSnippetInSource', () => {
  it('returns the reported line when that slice matches', () => {
    const snippet = "  it('waits with a real timer', async () => {";

    const result = locateSnippetInSource(SOURCE, snippet, 7);

    expect(result).toEqual({
      line: 7,
      sourceSnippet: snippet,
    });
  });

  it('ignores a trailing newline on the reported snippet', () => {
    const snippet = "  it('waits with a real timer', async () => {\n";

    const result = locateSnippetInSource(SOURCE, snippet, 7);

    expect(result?.line).toBe(7);
  });

  it('finds the snippet elsewhere when the reported line is the enclosing it()', () => {
    const snippet = '    await new Promise((r) => setTimeout(r, 50));';

    const result = locateSnippetInSource(SOURCE, snippet, 7);

    expect(result).toEqual({
      line: 8,
      sourceSnippet: snippet,
    });
  });

  it('treats trailing whitespace on a source line as equivalent', () => {
    const source = "  it('waits with a real timer', async () => {   \n";
    const snippet = "  it('waits with a real timer', async () => {";

    const result = locateSnippetInSource(source, snippet, 1);

    expect(result?.line).toBe(1);
    expect(result?.sourceSnippet).toBe(
      "  it('waits with a real timer', async () => {   ",
    );
  });

  it('returns null when the snippet is not in the file', () => {
    const result = locateSnippetInSource(
      SOURCE,
      '    jest.useFakeTimers();',
      7,
    );

    expect(result).toBeNull();
  });

  it('returns null for a whitespace-only snippet', () => {
    const result = locateSnippetInSource(SOURCE, '   \n', 1);

    expect(result).toBeNull();
  });
});

describe('snippetMismatchPreview', () => {
  it('quotes both sides so the CI log shows the mismatch', () => {
    const preview = snippetMismatchPreview('reported-code', 'actual-code');

    expect(preview).toBe(
      'reported="reported-code" actual="actual-code"',
    );
  });
});

describe('sourceSliceAtLine', () => {
  it('returns the file slice starting at the 1-based line', () => {
    const slice = sourceSliceAtLine(SOURCE, 8, 1);

    expect(slice).toBe('    await new Promise((r) => setTimeout(r, 50));');
  });
});
