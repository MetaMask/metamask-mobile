/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import {
  CATALOG_PATH,
  exitCodeFor,
  findMockResponse,
  formatReport,
  isSuspiciousRewrite,
  mergeShape,
  parseCatalog,
  rewriteExport,
  syncRow,
  type Json,
  type RowResult,
  type SyncDeps,
  type SyncRow,
} from './sync-api-mocks';

const row = (overrides: Partial<SyncRow> = {}): SyncRow => ({
  id: 'example',
  mode: 'write',
  syncUrl: 'https://example.test/api',
  file: 'tests/example.ts',
  exportName: 'EXAMPLE',
  mapPaths: new Set(),
  ...overrides,
});

describe('mergeShape', () => {
  it('keeps the mock when the shape matches, whatever the values are', () => {
    const mock = { price: 1, name: 'mock', tags: ['a'], nested: { x: true } };
    const live = { price: 999, name: 'live', tags: ['b', 'c'], nested: { x: false } };

    const result = mergeShape(mock, live);

    expect(result.value).toStrictEqual(mock);
    expect(result.changes).toStrictEqual([]);
  });

  it('adds a field only the live response has, with its live value', () => {
    const result = mergeShape({ price: 1 }, { price: 2, liquidity: 50 });

    expect(result.value).toStrictEqual({ price: 1, liquidity: 50 });
    expect(result.changes).toStrictEqual([
      { path: '/liquidity', kind: 'added' },
    ]);
  });

  it('removes a field the live response no longer has', () => {
    const result = mergeShape({ price: 1, usd: 1 }, { price: 2 });

    expect(result.value).toStrictEqual({ price: 1 });
    expect(result.changes).toStrictEqual([{ path: '/usd', kind: 'removed' }]);
  });

  it('takes the live value when the type of a field changed', () => {
    const result = mergeShape(
      { supported: { buy: true, sell: false } },
      { supported: true },
    );

    expect(result.value).toStrictEqual({ supported: true });
    expect(result.changes).toStrictEqual([
      { path: '/supported', kind: 'retyped' },
    ]);
  });

  it('keeps the mock value when the live value is null', () => {
    const result = mergeShape(
      { pricePercentChange1y: 5, other: 1 },
      { pricePercentChange1y: null, other: 2 },
    );

    expect(result.value).toStrictEqual({ pricePercentChange1y: 5, other: 1 });
    expect(result.changes).toStrictEqual([]);
  });

  it('does not add a field whose live value is null', () => {
    const result = mergeShape({ price: 1 }, { price: 2, holderCount: null });

    expect(result.value).toStrictEqual({ price: 1 });
    expect(result.changes).toStrictEqual([]);
  });

  it('adds and removes fields at any depth', () => {
    const result = mergeShape(
      { a: { b: { old: 1, kept: 2 } } },
      { a: { b: { kept: 9, fresh: 3 } } },
    );

    expect(result.value).toStrictEqual({ a: { b: { kept: 2, fresh: 3 } } });
    expect(result.changes).toStrictEqual([
      { path: '/a/b/old', kind: 'removed' },
      { path: '/a/b/fresh', kind: 'added' },
    ]);
  });

  it('keeps lists of primitives and empty lists', () => {
    const result = mergeShape(
      { fullSupport: ['eip155:1'], partialSupport: [] },
      { fullSupport: ['eip155:10', 'eip155:56'], partialSupport: ['x'] },
    );

    expect(result.value).toStrictEqual({
      fullSupport: ['eip155:1'],
      partialSupport: [],
    });
    expect(result.changes).toStrictEqual([]);
  });

  it('keeps lists of lists', () => {
    const mock = { prices: [[1, 2]] };

    const result = mergeShape(mock, { prices: [[3, 4], [5, 6]] });

    expect(result.value).toStrictEqual(mock);
  });

  it('keeps a mock list when the live list is empty', () => {
    const mock = { items: [{ id: 1 }] };

    expect(mergeShape(mock, { items: [] }).value).toStrictEqual(mock);
  });

  describe('lists of objects', () => {
    it('removes a field once no live item returns it', () => {
      const result = mergeShape(
        [{ id: 1, ko: 'x' }],
        [{ id: 2 }, { id: 3 }],
      );

      expect(result.value).toStrictEqual([{ id: 1 }]);
      expect(result.changes).toStrictEqual([
        { path: '/[]/ko', kind: 'removed' },
      ]);
    });

    it('keeps a field some live items return on the items that have it', () => {
      const result = mergeShape(
        [{ id: 1, fees: 5 }, { id: 2 }],
        [{ id: 3, fees: 1 }, { id: 4 }],
      );

      expect(result.value).toStrictEqual([{ id: 1, fees: 5 }, { id: 2 }]);
      expect(result.changes).toStrictEqual([]);
    });

    it('adds a field only when every live item returns it', () => {
      const result = mergeShape(
        [{ id: 1 }, { id: 2 }],
        [
          { id: 3, symbol: 'A' },
          { id: 4, symbol: 'B' },
        ],
      );

      expect(result.value).toStrictEqual([
        { id: 1, symbol: 'A' },
        { id: 2, symbol: 'A' },
      ]);
      expect(result.changes).toStrictEqual([
        { path: '/[]/symbol', kind: 'added' },
      ]);
    });

    it('applies the same rule to nested objects', () => {
      const result = mergeShape(
        [{ id: 1, meta: {} }],
        [
          { id: 2, meta: { storage: 1, common: 1 } },
          { id: 3, meta: { common: 2 } },
        ],
      );

      expect(result.value).toStrictEqual([{ id: 1, meta: { common: 1 } }]);
    });

    it('does not change the mock items when the live list has no objects', () => {
      const mock = [{ id: 1 }];

      expect(mergeShape(mock, ['a', 'b']).changes).toStrictEqual([
        { path: '/[]', kind: 'retyped' },
      ]);
    });
  });

  describe('data maps', () => {
    it('never adds or removes the keys of a map', () => {
      const result = mergeShape(
        { usd: { name: 'Dollar', value: 1 }, eur: { name: 'Euro', value: 0.9 } },
        { btc: { name: 'Bitcoin', value: 5, ticker: 'btc' } },
        new Set(['/']),
      );

      expect(Object.keys(result.value as object)).toStrictEqual(['usd', 'eur']);
    });

    it('aligns each entry with the live entry of the same key', () => {
      const result = mergeShape(
        { a: { price: 1 }, b: { price: 2 } },
        { a: { price: 9, extra: 1 }, b: { price: 8 } },
        new Set(['/']),
      );

      expect(result.value).toStrictEqual({
        a: { price: 1, extra: 1 },
        b: { price: 2 },
      });
    });

    it('uses every live entry for a key the live response lacks, adding only shared fields', () => {
      const result = mergeShape(
        { missing: { price: 1 } },
        { a: { price: 9, shared: 1, onlyA: 1 }, b: { price: 8, shared: 2 } },
        new Set(['/']),
      );

      expect(result.value).toStrictEqual({ missing: { price: 1, shared: 1 } });
    });

    it('treats a nested path as a map', () => {
      const result = mergeShape(
        { data: { '1': 3 } },
        { data: { '1': 4, '2': 5 } },
        new Set(['/data']),
      );

      expect(result.value).toStrictEqual({ data: { '1': 3 } });
      expect(result.changes).toStrictEqual([]);
    });
  });

  it('does not mutate its inputs', () => {
    const mock = { a: { b: 1 } };
    const live = { a: { b: 2, c: { d: 3 } } };

    const result = mergeShape(mock, live);
    (result.value as { a: { c: { d: number } } }).a.c.d = 99;

    expect(mock).toStrictEqual({ a: { b: 1 } });
    expect(live.a.c.d).toBe(3);
  });
});

describe('isSuspiciousRewrite', () => {
  it('refuses a rewrite that drops most top-level fields', () => {
    const mock = { low: 1, medium: 2, high: 3 };
    const result = mergeShape(mock, { error: 'Too many requests' });

    expect(isSuspiciousRewrite(mock, result, new Set())).toBe(true);
  });

  it('allows removing a minority of the fields', () => {
    const mock = { low: 1, medium: 2, high: 3 };
    const result = mergeShape(mock, { low: 1, medium: 2 });

    expect(isSuspiciousRewrite(mock, result, new Set())).toBe(false);
  });

  it('does not apply to data maps', () => {
    const mock = { a: { x: 1 }, b: { x: 1 } };
    const result = mergeShape(mock, {}, new Set(['/']));

    expect(isSuspiciousRewrite(mock, result, new Set(['/']))).toBe(false);
  });
});

describe('parseCatalog', () => {
  const header = '| ID | Mode | Sync URL | Mock | Options |\n| --- | --- | --- | --- | --- |';
  const catalog = (rows: string[], heading = '## Sync config'): string =>
    `# Catalog\n\n${heading}\n\nText.\n\n${header}\n${rows.join('\n')}\n\n## Next\n\n| not | parsed |\n`;

  it('parses write and report-only rows and ignores skip rows', () => {
    const rows = parseCatalog(
      catalog([
        '| `a` | `write` | `https://x.test/a` | `src/a.ts#A` | `map=/` |',
        '| `b` | `report-only` | `https://x.test/b` | `src/b.ts#B@https://x.test/b?q=1` | |',
        '| `c` | `skip` | | | |',
      ]),
    );

    expect(rows).toStrictEqual([
      {
        id: 'a',
        mode: 'write',
        syncUrl: 'https://x.test/a',
        file: 'src/a.ts',
        exportName: 'A',
        matchUrl: undefined,
        mapPaths: new Set(['/']),
      },
      {
        id: 'b',
        mode: 'report-only',
        syncUrl: 'https://x.test/b',
        file: 'src/b.ts',
        exportName: 'B',
        matchUrl: 'https://x.test/b?q=1',
        mapPaths: new Set(),
      },
    ]);
  });

  it('accepts several map paths', () => {
    const [parsed] = parseCatalog(
      catalog(['| `a` | `write` | `https://x.test/a` | `src/a.ts#A` | `map=/,/data` |']),
    );

    expect(parsed.mapPaths).toStrictEqual(new Set(['/', '/data']));
  });

  it.each([
    ['a missing section', '# Catalog\n'],
    [
      'an unknown mode',
      catalog(['| `a` | `sync` | `https://x.test/a` | `src/a.ts#A` | |']),
    ],
    [
      'a duplicate id',
      catalog([
        '| `a` | `write` | `https://x.test/a` | `src/a.ts#A` | |',
        '| `a` | `write` | `https://x.test/b` | `src/b.ts#B` | |',
      ]),
    ],
    [
      'a Sync URL that is not https',
      catalog(['| `a` | `write` | `http://x.test/a` | `src/a.ts#A` | |']),
    ],
    [
      'a Mock without an export',
      catalog(['| `a` | `write` | `https://x.test/a` | `src/a.ts` | |']),
    ],
    [
      'a write row that picks a list entry',
      catalog(['| `a` | `write` | `https://x.test/a` | `src/a.ts#A@https://x.test/a` | |']),
    ],
    [
      'an unknown option',
      catalog(['| `a` | `write` | `https://x.test/a` | `src/a.ts#A` | `list=/` |']),
    ],
  ])('rejects %s', (_name, markdown) => {
    expect(() => parseCatalog(markdown)).toThrow();
  });

  describe('the committed catalog', () => {
    const rows = parseCatalog(
      fs.readFileSync(path.resolve(CATALOG_PATH), 'utf8'),
    );

    it('lists at least one write and one report-only row', () => {
      expect(rows.some((r) => r.mode === 'write')).toBe(true);
      expect(rows.some((r) => r.mode === 'report-only')).toBe(true);
    });

    it.each(rows.map((r) => [r.id, r] as const))(
      'row %s points at an existing mock export',
      (_id, r) => {
        const source = fs.readFileSync(path.resolve(r.file), 'utf8');

        expect(source).toContain(`export const ${r.exportName}`);
      },
    );

    it.each(
      rows.filter((r) => r.mode === 'write').map((r) => [r.id, r] as const),
    )('write row %s is a rewritable `satisfies` export', (_id, r) => {
      const source = fs.readFileSync(path.resolve(r.file), 'utf8');

      expect(() => rewriteExport(source, r.exportName, {})).not.toThrow();
    });
  });
});

describe('rewriteExport', () => {
  const source = `import type { T } from './types';

/** Header. */
export const MOCK = {
  a: 1,
} satisfies T;
`;

  it('replaces the value and keeps the header and the satisfies clause', () => {
    const next = rewriteExport(source, 'MOCK', { a: 1, b: [2] });

    expect(next).toBe(`import type { T } from './types';

/** Header. */
export const MOCK = {"a":1,"b":[2]} satisfies T;
`);
  });

  it('throws when the export is missing', () => {
    expect(() => rewriteExport(source, 'OTHER', {})).toThrow('not found');
  });

  it('throws when the export is not typed with satisfies', () => {
    expect(() => rewriteExport('export const MOCK = {};\n', 'MOCK', {})).toThrow(
      'satisfies',
    );
  });
});

describe('findMockResponse', () => {
  const container = {
    GET: [
      { urlEndpoint: 'https://x.test/exact', response: { exact: true } },
      { urlEndpoint: /^https:\/\/x\.test\/v\d+\/list/u, response: { list: 1 } },
    ],
    POST: [{ urlEndpoint: 'https://x.test/post', response: [] }],
  };

  it('matches a string endpoint exactly', () => {
    expect(findMockResponse(container, 'https://x.test/exact')).toStrictEqual({
      exact: true,
    });
  });

  it('matches a regular expression endpoint', () => {
    expect(
      findMockResponse(container, 'https://x.test/v3/list?a=1'),
    ).toStrictEqual({ list: 1 });
  });

  it('looks through every HTTP method', () => {
    expect(findMockResponse(container, 'https://x.test/post')).toStrictEqual([]);
  });

  it('throws when nothing matches', () => {
    expect(() => findMockResponse(container, 'https://x.test/none')).toThrow(
      'No mock matches',
    );
  });
});

describe('syncRow', () => {
  const makeDeps = (
    mock: Json,
    live: Json | Error,
  ): { deps: SyncDeps; writeMock: jest.Mock } => {
    const writeMock = jest.fn().mockResolvedValue(undefined);
    const deps: SyncDeps = {
      loadMock: jest.fn().mockResolvedValue(mock),
      fetchJson: jest.fn().mockImplementation(async () => {
        if (live instanceof Error) {
          throw live;
        }
        return live;
      }),
      writeMock,
    };
    return { deps, writeMock };
  };

  it('reports ok and writes nothing when the shape matches', async () => {
    const { deps, writeMock } = makeDeps({ a: 1 }, { a: 2 });

    const result = await syncRow(row(), deps, { dryRun: false });

    expect(result).toMatchObject({ status: 'ok', written: false });
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('writes the merged mock for a write row with drift', async () => {
    const { deps, writeMock } = makeDeps({ a: 1 }, { a: 2, b: 3 });

    const result = await syncRow(row(), deps, { dryRun: false });

    expect(result).toMatchObject({ status: 'drift', written: true });
    expect(writeMock).toHaveBeenCalledWith(expect.anything(), { a: 1, b: 3 });
  });

  it('reports drift without writing on a dry run', async () => {
    const { deps, writeMock } = makeDeps({ a: 1 }, { a: 2, b: 3 });

    const result = await syncRow(row(), deps, { dryRun: true });

    expect(result).toMatchObject({ status: 'drift', written: false });
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('never writes a report-only row', async () => {
    const { deps, writeMock } = makeDeps({ a: 1 }, { a: 2, b: 3 });

    const result = await syncRow(row({ mode: 'report-only' }), deps, {
      dryRun: false,
    });

    expect(result).toMatchObject({ status: 'drift', written: false });
    expect(result.changes).toStrictEqual([{ path: '/b', kind: 'added' }]);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('refuses to write a response that looks like an error body', async () => {
    const { deps, writeMock } = makeDeps(
      { low: 1, medium: 2, high: 3 },
      { error: 'rate limited' },
    );

    const result = await syncRow(row(), deps, { dryRun: false });

    expect(result.status).toBe('refused');
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('reports an error when the fetch fails', async () => {
    const { deps, writeMock } = makeDeps({ a: 1 }, new Error('HTTP 503'));

    const result = await syncRow(row(), deps, { dryRun: false });

    expect(result).toMatchObject({ status: 'error', error: 'HTTP 503' });
    expect(writeMock).not.toHaveBeenCalled();
  });
});

describe('exitCodeFor', () => {
  const result = (overrides: Partial<RowResult>): RowResult => ({
    id: 'a',
    mode: 'write',
    file: 'a.ts',
    status: 'ok',
    changes: [],
    written: false,
    ...overrides,
  });

  it('is 0 without drift', () => {
    expect(exitCodeFor([result({})])).toBe(0);
  });

  it('is 1 for drift in a write row', () => {
    expect(exitCodeFor([result({ status: 'drift' })])).toBe(1);
  });

  it('is 2 for drift only in report-only rows', () => {
    expect(
      exitCodeFor([result({ status: 'drift', mode: 'report-only' })]),
    ).toBe(2);
  });

  it('is 3 when a row failed, even with drift elsewhere', () => {
    expect(
      exitCodeFor([result({ status: 'drift' }), result({ status: 'error' })]),
    ).toBe(3);
    expect(exitCodeFor([result({ status: 'refused' })])).toBe(3);
  });
});

describe('formatReport', () => {
  const drift = (id: string, mode: 'write' | 'report-only'): RowResult => ({
    id,
    mode,
    file: `${id}.ts`,
    status: 'drift',
    written: false,
    changes: [
      { path: '/a', kind: 'added' },
      { path: '/b', kind: 'removed' },
      { path: '/c', kind: 'retyped' },
    ],
  });

  it('says so when there is no drift', () => {
    expect(
      formatReport(
        [
          {
            id: 'a',
            mode: 'write',
            file: 'a.ts',
            status: 'ok',
            changes: [],
            written: false,
          },
        ],
        false,
      ),
    ).toBe('No API changes detected\n');
  });

  it('groups updated mocks, report-only drift and failures', () => {
    const report = formatReport(
      [
        drift('w', 'write'),
        drift('r', 'report-only'),
        {
          id: 'e',
          mode: 'write',
          file: 'e.ts',
          status: 'error',
          changes: [],
          written: false,
          error: 'HTTP 500',
        },
      ],
      false,
    );

    expect(report).toContain('### Mocks updated');
    expect(report).toContain('- `w` (`w.ts`)\n  - added `/a`');
    expect(report).toContain('type changed `/c`');
    expect(report).toContain('### Drift in report-only mocks');
    expect(report).toContain('- `r` (`r.ts`)');
    expect(report).toContain('### Rows that failed\n\n- `e`: HTTP 500');
  });

  it('labels write rows as pending on a dry run', () => {
    expect(formatReport([drift('w', 'write')], true)).toContain(
      '### Mocks that would be updated',
    );
  });

  it('truncates long change lists', () => {
    const many: RowResult = {
      ...drift('w', 'write'),
      changes: Array.from({ length: 20 }, (_v, index) => ({
        path: `/f${index}`,
        kind: 'added' as const,
      })),
    };

    const report = formatReport([many], false);

    expect(report).toContain('/f14');
    expect(report).not.toContain('/f15');
    expect(report).toContain('5 more');
  });
});
