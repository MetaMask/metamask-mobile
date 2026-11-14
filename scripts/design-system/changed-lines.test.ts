import { parseAddedLines } from './changed-lines';

const fooDiff = [
  'diff --git a/app/Foo.tsx b/app/Foo.tsx',
  'index 111..222 100644',
  '--- a/app/Foo.tsx',
  '+++ b/app/Foo.tsx',
  '@@ -10,0 +11,2 @@',
  '+marginRight: 8,',
  '+marginLeft: 0,',
  '@@ -20,2 +22,1 @@',
  '-old',
  '-old2',
  '+marginRight: 4,',
  '',
].join('\n');

describe('parseAddedLines', () => {
  it('returns added line numbers and skips deletions', () => {
    const diff = fooDiff;

    const added = parseAddedLines(diff);

    expect(added).toEqual({ 'app/Foo.tsx': [11, 12, 22] });
  });

  it('reads a one-line hunk header that omits the line count', () => {
    const diff = [
      'diff --git a/app/Foo.tsx b/app/Foo.tsx',
      '--- a/app/Foo.tsx',
      '+++ b/app/Foo.tsx',
      '@@ -4 +9 @@',
      '+gap: 2,',
    ].join('\n');

    const added = parseAddedLines(diff);

    expect(added).toEqual({ 'app/Foo.tsx': [9] });
  });

  it('returns lines for a new file and ignores a deleted file', () => {
    const diff = [
      'diff --git a/app/New.tsx b/app/New.tsx',
      '--- /dev/null',
      '+++ b/app/New.tsx',
      '@@ -0,0 +1,1 @@',
      '+export const styles = { marginRight: 8 };',
      'diff --git a/app/Old.tsx b/app/Old.tsx',
      '--- a/app/Old.tsx',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-export const styles = { marginRight: 8 };',
    ].join('\n');

    const added = parseAddedLines(diff);

    expect(added).toEqual({ 'app/New.tsx': [1] });
  });

  it('unquotes a path that contains a space', () => {
    const diff = [
      'diff --git "a/app/My File.tsx" "b/app/My File.tsx"',
      '--- "a/app/My File.tsx"',
      '+++ "b/app/My File.tsx"',
      '@@ -1 +1 @@',
      '+padding: 8,',
    ].join('\n');

    const added = parseAddedLines(diff);

    expect(added).toEqual({ 'app/My File.tsx': [1] });
  });

  it('returns an empty map for an empty diff', () => {
    const diff = '';

    const added = parseAddedLines(diff);

    expect(added).toEqual({});
  });
});
