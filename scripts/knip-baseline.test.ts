/**
 * Unit tests for the pure logic in knip-baseline.ts. The knip process itself
 * is not spawned here — only report normalization, diffing and formatting are
 * exercised.
 */

import {
  compareEntries,
  diffFindings,
  formatEntry,
  normalizeReport,
} from './knip-baseline';

describe('compareEntries', () => {
  it('sorts by issue type order before sorting entries of the same type', () => {
    const sorted = [
      'unlisted|a.ts|pkg',
      'dependencies|package.json|b-pkg',
      'files|z.ts',
      'dependencies|package.json|a-pkg',
      'files|a.ts',
    ].sort(compareEntries);

    expect(sorted).toEqual([
      'files|a.ts',
      'files|z.ts',
      'dependencies|package.json|a-pkg',
      'dependencies|package.json|b-pkg',
      'unlisted|a.ts|pkg',
    ]);
  });

  it('places unknown future issue types after known ones, sorted by name', () => {
    const sorted = ['zeta|f.ts|z', 'alpha|f.ts|a', 'cycles|f.ts|c'].sort(compareEntries);

    expect(sorted).toEqual(['cycles|f.ts|c', 'alpha|f.ts|a', 'zeta|f.ts|z']);
  });
});

describe('normalizeReport', () => {
  it('keys unused files by the flagged file itself', () => {
    const { entries } = normalizeReport([
      {
        file: 'app/components/UI/primitives/Image.tsx',
        owners: [{ name: '@MetaMask/mobile-core-ux' }],
        files: [{ name: 'app/components/UI/primitives/Image.tsx' }],
        dependencies: [],
        unlisted: [],
      },
    ]);

    expect(entries).toEqual(['files|app/components/UI/primitives/Image.tsx']);
  });

  it('keys dependency and unlisted findings by file and symbol', () => {
    const { entries } = normalizeReport([
      {
        file: 'package.json',
        dependencies: [{ name: '@sentry/react', line: 530, col: 6, pos: 32791 }],
        files: [],
        unlisted: [],
      },
      {
        file: 'app/util/test/netConnectGuard.js',
        dependencies: [],
        files: [],
        unlisted: [{ name: '@mswjs/interceptors' }],
      },
    ]);

    expect(entries).toEqual([
      'dependencies|package.json|@sentry/react',
      'unlisted|app/util/test/netConnectGuard.js|@mswjs/interceptors',
    ]);
  });

  it('drops line numbers from the baseline key but records them for annotations', () => {
    const { entries, linesByEntry } = normalizeReport([
      {
        file: 'package.json',
        dependencies: [{ name: 'cross-spawn', line: 561, col: 6, pos: 34069 }],
        files: [],
        unlisted: [],
      },
    ]);

    expect(entries).toEqual(['dependencies|package.json|cross-spawn']);
    expect(entries[0]).not.toContain('561');
    expect(linesByEntry.get('dependencies|package.json|cross-spawn')).toBe(561);
  });

  it('skips malformed symbols instead of throwing', () => {
    const { entries } = normalizeReport([
      {
        file: 'package.json',
        dependencies: [undefined, { name: 'chalk' }] as never,
        files: [],
        unlisted: [],
      },
    ]);

    expect(entries).toEqual(['dependencies|package.json|chalk']);
  });

  it('returns a sorted, deduplicated entry list', () => {
    const { entries } = normalizeReport([
      { file: 'b.ts', files: [{ name: 'b.ts' }], dependencies: [], unlisted: [] },
      { file: 'a.ts', files: [{ name: 'a.ts' }], dependencies: [], unlisted: [] },
      { file: 'a.ts', files: [{ name: 'a.ts' }], dependencies: [], unlisted: [] },
    ]);

    expect(entries).toEqual(['files|a.ts', 'files|b.ts']);
  });

  it('orders known issue types first and sorts unknown future types after them', () => {
    const { entries } = normalizeReport([
      {
        file: 'f.ts',
        files: [],
        unlisted: [{ name: 'z-package' }],
        zeta: [{ name: 'z' }],
        exports: [{ name: 'unusedExport' }],
      },
    ]);

    expect(entries).toEqual([
      'unlisted|f.ts|z-package',
      'exports|f.ts|unusedExport',
      'zeta|f.ts|z',
    ]);
  });
});

describe('diffFindings', () => {
  it('reports added and removed findings in both directions', () => {
    const { added, removed } = diffFindings(
      ['files|a.ts', 'files|b.ts'],
      ['files|b.ts', 'files|c.ts'],
    );

    expect(added).toEqual(['files|a.ts']);
    expect(removed).toEqual(['files|c.ts']);
  });

  it('reports no differences when both sides match', () => {
    const { added, removed } = diffFindings(['files|a.ts'], ['files|a.ts']);

    expect(added).toEqual([]);
    expect(removed).toEqual([]);
  });

  it('treats an empty baseline as all-new findings', () => {
    const { added, removed } = diffFindings(['files|a.ts'], []);

    expect(added).toEqual(['files|a.ts']);
    expect(removed).toEqual([]);
  });
});

describe('formatEntry', () => {
  it('prints a file finding as its path', () => {
    expect(formatEntry('files|app/components/UI/primitives/Pressable.tsx')).toBe(
      'app/components/UI/primitives/Pressable.tsx',
    );
  });

  it('prints a dependency finding as the package name', () => {
    expect(formatEntry('dependencies|package.json|cross-spawn')).toBe('cross-spawn');
  });

  it('prints an unlisted finding as symbol and importing file', () => {
    expect(formatEntry('unlisted|app/util/test/netConnectGuard.js|@mswjs/interceptors')).toBe(
      '@mswjs/interceptors (in app/util/test/netConnectGuard.js)',
    );
  });
});
