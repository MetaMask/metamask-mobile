/**
 * Unit tests for the pure parsing logic in attempt-audit-fix.ts.
 * execFileSync is mocked — no real yarn/git/gh calls. main() (the
 * orchestration entrypoint) is exercised end-to-end by the workflow itself,
 * not here.
 */

const mockExecFileSync = jest.fn();
jest.mock('child_process', () => ({ execFileSync: (...args: unknown[]) => mockExecFileSync(...args) }));

import { isAdvisoryCleared, parseAuditNdjson, parseYarnWhy, reverifyFixedBatch } from './attempt-audit-fix';

afterEach(() => {
  mockExecFileSync.mockReset();
});

function ndjsonLine(entry: Record<string, unknown>): string {
  return JSON.stringify(entry);
}

describe('parseAuditNdjson', () => {
  it('parses a well-formed advisory line', () => {
    const raw = ndjsonLine({ value: 'lodash', children: { ID: 'GHSA-abcd' } });

    expect(parseAuditNdjson(raw)).toEqual([{ pkg: 'lodash', id: 'GHSA-abcd' }]);
  });

  it('drops a line missing the ID field', () => {
    const raw = ndjsonLine({ value: 'lodash', children: {} });

    expect(parseAuditNdjson(raw)).toEqual([]);
  });

  it('drops unparsable JSON without throwing', () => {
    const raw = ['not json', ndjsonLine({ value: 'axios', children: { ID: 'GHSA-2' } })].join('\n');

    expect(parseAuditNdjson(raw)).toEqual([{ pkg: 'axios', id: 'GHSA-2' }]);
  });

  it('skips blank lines', () => {
    const raw = ['', '   ', ndjsonLine({ value: 'axios', children: { ID: 'GHSA-2' } })].join('\n');

    expect(parseAuditNdjson(raw)).toHaveLength(1);
  });

  it('accepts a numeric ID and normalizes it to a string (real `yarn npm audit --json` shape)', () => {
    const raw = ndjsonLine({ value: 'browserify-sign', children: { ID: 1094464 } });

    expect(parseAuditNdjson(raw)).toEqual([{ pkg: 'browserify-sign', id: '1094464' }]);
  });
});

describe('isAdvisoryCleared', () => {
  function throwWithStdio(stdout: string, stderr: string): never {
    const error = new Error('command failed') as Error & { stdout?: string; stderr?: string };
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }

  it('fails closed (not cleared) when the audit errors with genuinely no stdout', () => {
    mockExecFileSync.mockImplementation(() => throwWithStdio('', ''));

    expect(isAdvisoryCleared('lodash', 'GHSA-1')).toBe(false);
  });

  it('fails closed when an infra/network error writes only to stderr, not stdout', () => {
    // Regression test: an infra failure almost always writes *something* to
    // stderr (e.g. a registry FetchError) even though stdout — the only
    // thing that ever contains real advisory data — is empty. This must
    // still fail closed instead of reading as "no advisories remain".
    mockExecFileSync.mockImplementation(() => throwWithStdio('', 'FetchError: request to https://registry.npmjs.org/ failed'));

    expect(isAdvisoryCleared('lodash', 'GHSA-1')).toBe(false);
  });

  it('reports cleared when the re-audit fails (other advisories remain) but this id is not in stdout', () => {
    mockExecFileSync.mockImplementation(() => throwWithStdio(ndjsonLine({ value: 'axios', children: { ID: 'GHSA-2' } }), ''));

    expect(isAdvisoryCleared('lodash', 'GHSA-1')).toBe(true);
  });

  it('reports not cleared when the id is still present in stdout', () => {
    mockExecFileSync.mockImplementation(() => throwWithStdio(ndjsonLine({ value: 'lodash', children: { ID: 'GHSA-1' } }), ''));

    expect(isAdvisoryCleared('lodash', 'GHSA-1')).toBe(false);
  });

  it('reports cleared on a clean (exit 0) re-audit', () => {
    mockExecFileSync.mockReturnValue('');

    expect(isAdvisoryCleared('lodash', 'GHSA-1')).toBe(true);
  });
});

describe('reverifyFixedBatch', () => {
  function fixedEntry(overrides: Partial<{ pkg: string; id: string; url: string }> = {}) {
    return {
      pkg: overrides.pkg ?? 'lodash',
      id: overrides.id ?? 'GHSA-1',
      severity: 'high',
      title: 'lodash prototype pollution',
      url: overrides.url,
      method: 'ai-analyzer' as const,
      toVersion: '5.0.0',
    };
  }

  it('keeps an entry whose advisory is still cleared in the final tree', () => {
    mockExecFileSync.mockReturnValue('');

    const { stillFixed, regressed } = reverifyFixedBatch([fixedEntry()]);

    expect(stillFixed).toEqual([fixedEntry()]);
    expect(regressed).toEqual([]);
  });

  it('demotes an entry back to manual when a later fix reintroduced its advisory', () => {
    mockExecFileSync.mockReturnValue(ndjsonLine({ value: 'lodash', children: { ID: 'GHSA-1' } }));

    const { stillFixed, regressed } = reverifyFixedBatch([fixedEntry({ url: 'https://example.com/GHSA-1' })]);

    expect(stillFixed).toEqual([]);
    expect(regressed).toEqual([
      {
        pkg: 'lodash',
        id: 'GHSA-1',
        severity: 'high',
        title: 'lodash prototype pollution',
        url: 'https://example.com/GHSA-1',
        reason: expect.stringContaining('reintroduced'),
      },
    ]);
  });

  it('evaluates each entry against the batch independently, keeping unaffected ones fixed', () => {
    mockExecFileSync.mockReturnValue(ndjsonLine({ value: 'lodash', children: { ID: 'GHSA-1' } }));

    const { stillFixed, regressed } = reverifyFixedBatch([fixedEntry({ pkg: 'lodash', id: 'GHSA-1' }), fixedEntry({ pkg: 'axios', id: 'GHSA-2' })]);

    expect(stillFixed).toEqual([fixedEntry({ pkg: 'axios', id: 'GHSA-2' })]);
    expect(regressed.map((entry) => entry.id)).toEqual(['GHSA-1']);
  });
});

describe('parseYarnWhy', () => {
  function whyLine(consumerValue: string, childKey: string, child: { locator?: string; descriptor?: string }): string {
    return JSON.stringify({ value: consumerValue, children: { [childKey]: child } });
  }

  it('returns empty results when the yarn command fails', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('command not found');
    });

    expect(parseYarnWhy('bn.js')).toEqual({ versions: [], dependents: { list: [], truncated: 0 } });
  });

  it('extracts the resolved version from a locator', () => {
    mockExecFileSync.mockReturnValue(whyLine('some-pkg@npm:1.0.0', 'bn.js@npm:^4.11.0', { locator: 'bn.js@npm:4.12.0' }));

    expect(parseYarnWhy('bn.js').versions).toEqual(['4.12.0']);
  });

  it('falls back to the child key when locator is absent', () => {
    mockExecFileSync.mockReturnValue(whyLine('some-pkg@npm:1.0.0', 'bn.js@npm:4.12.0', {}));

    expect(parseYarnWhy('bn.js').versions).toEqual(['4.12.0']);
  });

  it('extracts the consumer and requested range from the descriptor', () => {
    mockExecFileSync.mockReturnValue(whyLine('some-pkg@npm:1.0.0', 'bn.js@npm:^4.11.0', { descriptor: 'bn.js@npm:^4.11.0', locator: 'bn.js@npm:4.12.0' }));

    expect(parseYarnWhy('bn.js').dependents.list).toEqual([{ via: 'some-pkg', range: '^4.11.0' }]);
  });

  it('dedupes multiple ranges from the same consumer into one entry', () => {
    const raw = [
      whyLine('some-pkg@npm:1.0.0', 'bn.js@npm:^4.11.0', { descriptor: 'bn.js@npm:^4.11.0' }),
      whyLine('some-pkg@virtual:abcd#npm:1.0.0', 'bn.js@npm:^4.11.0', { descriptor: 'bn.js@npm:^4.11.0' }),
    ].join('\n');
    mockExecFileSync.mockReturnValue(raw);

    expect(parseYarnWhy('bn.js').dependents.list).toEqual([{ via: 'some-pkg', range: '^4.11.0' }]);
  });

  it('joins distinct ranges from the same consumer with a separator', () => {
    const raw = [
      whyLine('some-pkg@npm:1.0.0', 'bn.js@npm:^4.11.0', { descriptor: 'bn.js@npm:^4.11.0' }),
      whyLine('some-pkg@npm:1.0.0', 'bn.js@npm:^5.0.0', { descriptor: 'bn.js@npm:^5.0.0' }),
    ].join('\n');
    mockExecFileSync.mockReturnValue(raw);

    expect(parseYarnWhy('bn.js').dependents.list[0].range).toBe('^4.11.0 | ^5.0.0');
  });

  it('sorts dependents alphabetically by consumer name', () => {
    const raw = [
      whyLine('zeta@npm:1.0.0', 'bn.js@npm:^4.0.0', { descriptor: 'bn.js@npm:^4.0.0' }),
      whyLine('alpha@npm:1.0.0', 'bn.js@npm:^4.0.0', { descriptor: 'bn.js@npm:^4.0.0' }),
    ].join('\n');
    mockExecFileSync.mockReturnValue(raw);

    expect(parseYarnWhy('bn.js').dependents.list.map((d) => d.via)).toEqual(['alpha', 'zeta']);
  });

  it('caps dependents at the given limit and reports the truncated count', () => {
    const raw = ['a', 'b', 'c'].map((name) => whyLine(`${name}@npm:1.0.0`, 'bn.js@npm:^4.0.0', { descriptor: 'bn.js@npm:^4.0.0' })).join('\n');
    mockExecFileSync.mockReturnValue(raw);

    const { list, truncated } = parseYarnWhy('bn.js', 2).dependents;

    expect(list).toHaveLength(2);
    expect(truncated).toBe(1);
  });

  it('reports zero truncated when everything fits under the limit', () => {
    mockExecFileSync.mockReturnValue(whyLine('some-pkg@npm:1.0.0', 'bn.js@npm:^4.0.0', { descriptor: 'bn.js@npm:^4.0.0' }));

    expect(parseYarnWhy('bn.js', 12).dependents.truncated).toBe(0);
  });

  it('skips unparsable lines without throwing', () => {
    const raw = ['not json', whyLine('some-pkg@npm:1.0.0', 'bn.js@npm:^4.0.0', { descriptor: 'bn.js@npm:^4.0.0', locator: 'bn.js@npm:4.1.0' })].join('\n');
    mockExecFileSync.mockReturnValue(raw);

    const info = parseYarnWhy('bn.js');
    expect(info.versions).toEqual(['4.1.0']);
    expect(info.dependents.list).toEqual([{ via: 'some-pkg', range: '^4.0.0' }]);
  });

  it('skips a child entry whose key/locator/descriptor have no npm: version to extract', () => {
    mockExecFileSync.mockReturnValue(whyLine('some-pkg@npm:1.0.0', 'bn.js@workspace:.', {}));

    expect(parseYarnWhy('bn.js')).toEqual({ versions: [], dependents: { list: [], truncated: 0 } });
  });
});
