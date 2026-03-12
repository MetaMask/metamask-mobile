jest.mock('./known-feature-flag-constants', () => ({
  buildKnownFlagConstants: () => ({
    'FeatureFlagNames.MyFlag': 'myResolvedFlag',
    MY_CONSTANT: 'myConstantFlag',
  }),
  resolveConstantFromSourceFile: jest.fn(() => undefined),
}));

jest.mock('@actions/github', () => ({
  context: { payload: {}, repo: { owner: 'test', repo: 'test' } },
  getOctokit: jest.fn(),
}));

import {
  parseDiff,
  extractFlagReferences,
  extractMultiLineDestructuring,
  extractDestructuredIdentifiers,
} from './check-feature-flag-registry';

describe('extractDestructuredIdentifiers', () => {
  it.each([
    ['simple identifiers', 'flagA, flagB', ['flagA', 'flagB']],
    ['renaming (before colon)', 'flagA: renamed', ['flagA']],
    ['rest elements skipped', 'flagA, ...rest', ['flagA']],
    ['empty parts skipped', 'flagA, , flagB', ['flagA', 'flagB']],
    ['whitespace handled', '  flagA ,  flagB  ', ['flagA', 'flagB']],
  ])('extracts %s', (_label, input, expected) => {
    expect(extractDestructuredIdentifiers(input as string)).toEqual(expected);
  });
});

describe('parseDiff', () => {
  it('parses added lines grouped into contiguous chunks', () => {
    const diff = [
      'diff --git a/app/test.ts b/app/test.ts',
      '--- a/app/test.ts', '+++ b/app/test.ts',
      '@@ -1,3 +1,4 @@',
      ' const a = 1;', '+const b = 2;', '+const c = 3;', ' const d = 4;',
    ].join('\n');

    const chunks = parseDiff(diff).added.get('app/test.ts');
    expect(chunks).toHaveLength(1);
    expect(chunks![0]).toEqual(['const b = 2;', 'const c = 3;']);
  });

  it('parses removed lines', () => {
    const diff = ['--- a/app/test.ts', '+++ b/app/test.ts', '@@ -1,3 +1,2 @@', '-const old = true;', ' const keep = true;'].join('\n');
    expect(parseDiff(diff).removed.get('app/test.ts')).toEqual(['const old = true;']);
  });

  it('splits non-contiguous added lines into separate chunks', () => {
    const diff = ['--- a/app/test.ts', '+++ b/app/test.ts', '@@ -1,5 +1,7 @@', '+const first = 1;', ' const middle = 2;', '+const second = 3;'].join('\n');
    const chunks = parseDiff(diff).added.get('app/test.ts');
    expect(chunks).toHaveLength(2);
    expect(chunks![0]).toEqual(['const first = 1;']);
    expect(chunks![1]).toEqual(['const second = 3;']);
  });

  it('handles multiple files in one diff', () => {
    const diff = ['--- a/app/a.ts', '+++ b/app/a.ts', '@@ -1 +1,2 @@', '+line in a', '--- a/app/b.ts', '+++ b/app/b.ts', '@@ -1 +1,2 @@', '+line in b'].join('\n');
    const result = parseDiff(diff);
    expect(result.added.get('app/a.ts')![0]).toEqual(['line in a']);
    expect(result.added.get('app/b.ts')![0]).toEqual(['line in b']);
  });

  it('handles deleted files (+++ /dev/null)', () => {
    const diff = ['--- a/app/old.ts', '+++ /dev/null', '@@ -1,2 +0,0 @@', '-const removed = true;'].join('\n');
    expect(parseDiff(diff).removed.get('app/old.ts')).toEqual(['const removed = true;']);
  });

  it('returns empty maps for empty diff', () => {
    const result = parseDiff('');
    expect(result.added.size).toBe(0);
    expect(result.removed.size).toBe(0);
  });
});

describe('extractFlagReferences', () => {
  const file = 'app/test.ts';
  const ref = (flagName: string) => [{ flagName, filePath: file }];

  describe('dot access patterns', () => {
    it.each([
      ['remoteFeatureFlags.myFlag', 'const v = remoteFeatureFlags.myFlag;'],
      ['remoteFeatureFlags?.myFlag', 'const v = remoteFeatureFlags?.myFlag;'],
      ['selectRemoteFeatureFlags(state).myFlag', 'const v = selectRemoteFeatureFlags(state).myFlag;'],
      ['selectRemoteFeatureFlags(state)?.myFlag', 'const v = selectRemoteFeatureFlags(state)?.myFlag;'],
    ])('detects %s', (_label, line) => {
      expect(extractFlagReferences(line, file)).toEqual(ref('myFlag'));
    });
  });

  describe('bracket access', () => {
    it.each([
      ['double quotes', 'remoteFeatureFlags["myBracketFlag"]', 'myBracketFlag'],
      ['single quotes', "remoteFeatureFlags['myBracketFlag']", 'myBracketFlag'],
      ['hyphenated name', 'remoteFeatureFlags["my-hyphenated-flag"]', 'my-hyphenated-flag'],
    ])('detects string literal with %s', (_label, line, expected) => {
      expect(extractFlagReferences(line, file)).toEqual(ref(expected));
    });

    it('resolves FeatureFlagNames.MyFlag constant', () => {
      expect(extractFlagReferences('remoteFeatureFlags[FeatureFlagNames.MyFlag]', file)).toEqual(ref('myResolvedFlag'));
    });

    it('resolves standalone MY_CONSTANT', () => {
      expect(extractFlagReferences('remoteFeatureFlags[MY_CONSTANT]', file)).toEqual(ref('myConstantFlag'));
    });
  });

  it('detects hasProperty(remoteFeatureFlags, "flagName")', () => {
    expect(extractFlagReferences('hasProperty(remoteFeatureFlags, "propFlag")', file)).toEqual(ref('propFlag'));
  });

  describe('destructuring patterns', () => {
    it('detects destructuring from selectRemoteFeatureFlags', () => {
      const names = extractFlagReferences('const { flagA, flagB } = selectRemoteFeatureFlags(state);', file).map((r) => r.flagName);
      expect(names).toContain('flagA');
      expect(names).toContain('flagB');
    });

    it('detects destructuring with useSelector', () => {
      expect(extractFlagReferences('const { flagC } = useSelector(selectRemoteFeatureFlags);', file)).toEqual(ref('flagC'));
    });

    it('skips destructuring when skipDestructuring is true', () => {
      const names = extractFlagReferences('const { flagSkipped } = selectRemoteFeatureFlags(state);', file, true).map((r) => r.flagName);
      expect(names).not.toContain('flagSkipped');
    });
  });

  describe('ignores non-code references', () => {
    it.each([
      ['line comments', '// remoteFeatureFlags.myFlag'],
      ['inline comments', 'const x = 1; // remoteFeatureFlags.myFlag'],
      ['string literals', "const msg = 'remoteFeatureFlags.fakeFlag';"],
    ])('ignores %s', (_label, line) => {
      expect(extractFlagReferences(line, file)).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it.each([
      ['no flag references', 'const x = 1 + 2;'],
      ['empty line', ''],
      ['non-flag name (constructor)', 'remoteFeatureFlags.constructor'],
    ])('returns empty for %s', (_label, line) => {
      expect(extractFlagReferences(line, file)).toEqual([]);
    });
  });
});

describe('extractMultiLineDestructuring', () => {
  it('detects destructuring split across multiple lines', () => {
    const chunk = ['const {', '  flagMulti,', '  flagMultiB,', '} = selectRemoteFeatureFlags(state);'];
    const names = extractMultiLineDestructuring(chunk, 'app/test.ts').map((r) => r.flagName);
    expect(names).toContain('flagMulti');
    expect(names).toContain('flagMultiB');
  });

  it('returns empty when no destructuring is present', () => {
    expect(extractMultiLineDestructuring(['const x = 1;', 'const y = 2;'], 'app/test.ts')).toEqual([]);
  });

  it('looks backward up to 10 lines for the opening brace', () => {
    const chunk = ['const {', '  flagDeep1,', '  flagDeep2,', '  flagDeep3,', '  flagDeep4,',
      '  flagDeep5,', '  flagDeep6,', '  flagDeep7,', '  flagDeep8,', '} = selectRemoteFeatureFlags(state);'];
    const names = extractMultiLineDestructuring(chunk, 'app/test.ts').map((r) => r.flagName);
    expect(names).toContain('flagDeep1');
    expect(names).toContain('flagDeep8');
  });
});
