/**
 * Unit tests for the pure parsing/dedupe logic in collect-audit-advisories.ts.
 * No filesystem or process.argv access — main() (the only I/O-touching
 * export) is exercised by the workflow itself, not here.
 */

import {
  buildResult,
  loadSkipIds,
  parseAuditNdjson,
} from './collect-audit-advisories';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const fs = require('fs');

afterEach(() => {
  jest.mocked(fs.existsSync).mockReset();
  jest.mocked(fs.readFileSync).mockReset();
});

function ndjsonLine(entry: Record<string, unknown>): string {
  return JSON.stringify(entry);
}

describe('parseAuditNdjson', () => {
  it('parses a well-formed advisory line', () => {
    const raw = ndjsonLine({
      value: 'lodash',
      children: {
        ID: 'GHSA-abcd',
        Issue: 'Prototype pollution',
        URL: 'https://example.com/GHSA-abcd',
        Severity: 'moderate',
      },
    });

    expect(parseAuditNdjson(raw)).toEqual([
      { pkg: 'lodash', id: 'GHSA-abcd', title: 'Prototype pollution', url: 'https://example.com/GHSA-abcd', severity: 'moderate' },
    ]);
  });

  it('parses multiple lines and skips blank ones', () => {
    const raw = [
      ndjsonLine({ value: 'lodash', children: { ID: 'GHSA-1', Issue: 'a', Severity: 'low' } }),
      '',
      '   ',
      ndjsonLine({ value: 'axios', children: { ID: 'GHSA-2', Issue: 'b', Severity: 'high' } }),
    ].join('\n');

    expect(parseAuditNdjson(raw)).toHaveLength(2);
  });

  it('accepts a numeric ID and normalizes it to a string (real `yarn npm audit --json` shape)', () => {
    const raw = ndjsonLine({
      value: 'browserify-sign',
      children: {
        ID: 1094464,
        Issue: 'browserify-sign upper bound check issue in `dsaVerify`',
        URL: 'https://github.com/advisories/GHSA-x9w5-v3q2-3rhw',
        Severity: 'high',
      },
    });

    expect(parseAuditNdjson(raw)).toEqual([
      {
        pkg: 'browserify-sign',
        id: '1094464',
        title: 'browserify-sign upper bound check issue in `dsaVerify`',
        url: 'https://github.com/advisories/GHSA-x9w5-v3q2-3rhw',
        severity: 'high',
      },
    ]);
  });

  it('drops a line missing required fields', () => {
    const raw = ndjsonLine({ value: 'lodash', children: { Issue: 'a', Severity: 'low' } }); // no ID

    expect(parseAuditNdjson(raw)).toEqual([]);
  });

  it('drops a line with no children at all', () => {
    const raw = ndjsonLine({ value: 'lodash' });

    expect(parseAuditNdjson(raw)).toEqual([]);
  });

  it('drops unparsable JSON without throwing', () => {
    const raw = ['not json', ndjsonLine({ value: 'axios', children: { ID: 'GHSA-2', Issue: 'b', Severity: 'high' } })].join('\n');

    expect(parseAuditNdjson(raw)).toEqual([{ pkg: 'axios', id: 'GHSA-2', title: 'b', url: undefined, severity: 'high' }]);
  });

  it('treats a non-string URL as absent', () => {
    const raw = ndjsonLine({ value: 'lodash', children: { ID: 'GHSA-1', Issue: 'a', Severity: 'low', URL: 42 } });

    expect(parseAuditNdjson(raw)[0].url).toBeUndefined();
  });
});

describe('loadSkipIds', () => {
  it('returns an empty set when no path is given', () => {
    expect(loadSkipIds(undefined)).toEqual(new Set());
  });

  it('returns an empty set when the file does not exist', () => {
    jest.mocked(fs.existsSync).mockReturnValue(false);

    expect(loadSkipIds('skip-ids.json')).toEqual(new Set());
  });

  it('parses a JSON array of IDs into a set', () => {
    jest.mocked(fs.existsSync).mockReturnValue(true);
    jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(['GHSA-1', 'GHSA-2']));

    expect(loadSkipIds('skip-ids.json')).toEqual(new Set(['GHSA-1', 'GHSA-2']));
  });

  it('returns an empty set for malformed JSON instead of throwing', () => {
    jest.mocked(fs.existsSync).mockReturnValue(true);
    jest.mocked(fs.readFileSync).mockReturnValue('not json');

    expect(loadSkipIds('skip-ids.json')).toEqual(new Set());
  });

  it('returns an empty set when the parsed JSON is not an array', () => {
    jest.mocked(fs.existsSync).mockReturnValue(true);
    jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ not: 'an array' }));

    expect(loadSkipIds('skip-ids.json')).toEqual(new Set());
  });
});

describe('buildResult', () => {
  const advisory = (pkg: string, id: string) => ({ pkg, id, title: `${pkg} issue`, severity: 'moderate', url: undefined });

  it('puts every advisory not in the skip-list into manual, with fixed always empty', () => {
    const result = buildResult([advisory('lodash', 'GHSA-1'), advisory('axios', 'GHSA-2')], new Set());

    expect(result.fixed).toEqual([]);
    expect(result.manual).toHaveLength(2);
    expect(result.manual.map((e) => e.id)).toEqual(['GHSA-1', 'GHSA-2']);
    expect(result.manual[0].reason).toBe('Pending AI-assisted review.');
  });

  it('drops advisories whose id is in the skip-list', () => {
    const result = buildResult([advisory('lodash', 'GHSA-1'), advisory('axios', 'GHSA-2')], new Set(['GHSA-1']));

    expect(result.manual.map((e) => e.id)).toEqual(['GHSA-2']);
  });

  it('de-dupes repeated (pkg, id) pairs', () => {
    const result = buildResult([advisory('lodash', 'GHSA-1'), advisory('lodash', 'GHSA-1')], new Set());

    expect(result.manual).toHaveLength(1);
  });

  it('does not de-dupe the same id on a different package', () => {
    const result = buildResult([advisory('lodash', 'GHSA-1'), advisory('axios', 'GHSA-1')], new Set());

    expect(result.manual).toHaveLength(2);
  });

  it('returns an empty manual list when everything is skipped', () => {
    const result = buildResult([advisory('lodash', 'GHSA-1')], new Set(['GHSA-1']));

    expect(result.manual).toEqual([]);
  });

  it('caps the manual list at maxPerRun, leaving the rest for a later run', () => {
    const advisories = [advisory('a', 'GHSA-1'), advisory('b', 'GHSA-2'), advisory('c', 'GHSA-3')];

    const result = buildResult(advisories, new Set(), 2);

    expect(result.manual.map((e) => e.id)).toEqual(['GHSA-1', 'GHSA-2']);
  });

  it('does not count skip-listed or duplicate advisories against the cap', () => {
    const advisories = [advisory('skip-me', 'GHSA-0'), advisory('a', 'GHSA-1'), advisory('a', 'GHSA-1'), advisory('b', 'GHSA-2')];

    const result = buildResult(advisories, new Set(['GHSA-0']), 2);

    expect(result.manual.map((e) => e.id)).toEqual(['GHSA-1', 'GHSA-2']);
  });

  it('defaults maxPerRun to 20 when not specified', () => {
    const advisories = Array.from({ length: 25 }, (_, i) => advisory(`pkg-${i}`, `GHSA-${i}`));

    const result = buildResult(advisories, new Set());

    expect(result.manual).toHaveLength(20);
  });
});
