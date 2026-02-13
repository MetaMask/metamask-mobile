import {
  sortObjectKeysDeep,
  computeSchemaDiff,
  hasSchemaDifferences,
  mergeFixtureChanges,
  formatSchemaDiff,
  readFixtureFile,
  getMobileFixtureIgnoredKeys,
  FixtureSchemaDiff,
} from './fixture-validation';

const emptyDiff: FixtureSchemaDiff = {
  newKeys: [],
  missingKeys: [],
  typeMismatches: [],
  valueMismatches: [],
};

describe('fixture-validation', () => {
  describe('sortObjectKeysDeep', () => {
    it('sorts top-level keys alphabetically', () => {
      expect(sortObjectKeysDeep({ c: 1, a: 2, b: 3 })).toEqual({
        a: 2,
        b: 3,
        c: 1,
      });
    });

    it('sorts nested object keys', () => {
      expect(sortObjectKeysDeep({ z: { b: 1, a: 2 } })).toEqual({
        z: { a: 2, b: 1 },
      });
    });

    it('sorts object keys inside arrays without reordering elements', () => {
      const input = [
        { z: 1, a: 2 },
        { m: 3, b: 4 },
      ];
      expect(sortObjectKeysDeep(input)).toEqual([
        { a: 2, z: 1 },
        { b: 4, m: 3 },
      ]);
    });

    it('preserves array element order', () => {
      expect(sortObjectKeysDeep([3, 1, 2])).toEqual([3, 1, 2]);
    });

    it('handles null, undefined, and primitives', () => {
      expect(sortObjectKeysDeep(null)).toBeNull();
      expect(sortObjectKeysDeep(undefined)).toBeUndefined();
      expect(sortObjectKeysDeep(42)).toBe(42);
      expect(sortObjectKeysDeep('hello')).toBe('hello');
    });
  });

  describe('computeSchemaDiff', () => {
    it('returns empty diff for identical objects', () => {
      const obj = { a: 1, b: 'two', c: { d: true } };
      const diff = computeSchemaDiff(obj, obj, []);
      expect(hasSchemaDifferences(diff)).toBe(false);
    });

    it('detects new keys in candidate', () => {
      const baseline = { a: 1 };
      const candidate = { a: 1, b: 2 };
      const diff = computeSchemaDiff(baseline, candidate, []);
      expect(diff.newKeys).toEqual(['b']);
    });

    it('detects missing keys from candidate', () => {
      const baseline = { a: 1, b: 2 };
      const candidate = { a: 1 };
      const diff = computeSchemaDiff(baseline, candidate, []);
      expect(diff.missingKeys).toEqual(['b']);
    });

    it('detects type mismatches', () => {
      const baseline = { a: 1 };
      const candidate = { a: 'one' };
      const diff = computeSchemaDiff(baseline, candidate, []);
      expect(diff.typeMismatches).toEqual([
        { key: 'a', expected: 'number', received: 'string' },
      ]);
    });

    it('detects value mismatches for primitives', () => {
      const baseline = { a: 1, b: 'hello' };
      const candidate = { a: 2, b: 'world' };
      const diff = computeSchemaDiff(baseline, candidate, []);
      expect(diff.valueMismatches).toEqual([
        { key: 'a', expected: 1, received: 2 },
        { key: 'b', expected: 'hello', received: 'world' },
      ]);
    });

    it('does not compare object values directly', () => {
      const baseline = { obj: { x: 1 } };
      const candidate = { obj: { x: 1 } };
      const diff = computeSchemaDiff(baseline, candidate, []);
      expect(diff.valueMismatches).toEqual([]);
    });

    it('compares full array contents, not just index 0', () => {
      const baseline = { items: ['a', 'b', 'c'] };
      const candidate = { items: ['a', 'b'] };
      const diff = computeSchemaDiff(baseline, candidate, []);
      // The arrays differ, so items itself is reported as a value mismatch
      const arrayMismatch = diff.valueMismatches.find((m) => m.key === 'items');
      expect(arrayMismatch).toBeDefined();
      expect(arrayMismatch?.expected).toEqual(['a', 'b', 'c']);
      expect(arrayMismatch?.received).toEqual(['a', 'b']);
    });

    it('reports no array mismatch when contents are identical', () => {
      const baseline = { items: [1, 2, 3] };
      const candidate = { items: [1, 2, 3] };
      const diff = computeSchemaDiff(baseline, candidate, []);
      expect(diff.valueMismatches).toEqual([]);
    });

    it('filters ignored keys by exact prefix match', () => {
      const baseline = { a: 1 };
      const candidate = { a: 1, ignored: { deep: { key: 'val' } } };
      const diff = computeSchemaDiff(baseline, candidate, ['ignored']);
      expect(diff.newKeys).toEqual([]);
    });

    it('filters ignored keys by wildcard match', () => {
      const baseline = { nets: { '0x1': { rpc: { id: 'a' } } } };
      const candidate = { nets: { '0x1': { rpc: { id: 'b' } } } };
      const diff = computeSchemaDiff(baseline, candidate, ['nets.*.rpc.id']);
      expect(diff.valueMismatches).toEqual([]);
    });

    it('accepts custom ignoredKeys override', () => {
      const baseline = { a: 1 };
      const candidate = { a: 1, b: 2 };
      const withIgnore = computeSchemaDiff(baseline, candidate, ['b']);
      const withoutIgnore = computeSchemaDiff(baseline, candidate, []);
      expect(withIgnore.newKeys).toEqual([]);
      expect(withoutIgnore.newKeys).toEqual(['b']);
    });
  });

  describe('hasSchemaDifferences', () => {
    it('returns false for empty diff', () => {
      expect(hasSchemaDifferences(emptyDiff)).toBe(false);
    });

    it('returns true for each non-empty category', () => {
      expect(hasSchemaDifferences({ ...emptyDiff, newKeys: ['a'] })).toBe(true);
      expect(hasSchemaDifferences({ ...emptyDiff, missingKeys: ['a'] })).toBe(
        true,
      );
      expect(
        hasSchemaDifferences({
          ...emptyDiff,
          typeMismatches: [{ key: 'a', expected: 'x', received: 'y' }],
        }),
      ).toBe(true);
      expect(
        hasSchemaDifferences({
          ...emptyDiff,
          valueMismatches: [{ key: 'a', expected: 1, received: 2 }],
        }),
      ).toBe(true);
    });
  });

  describe('mergeFixtureChanges', () => {
    it('adds new keys from newState', () => {
      const existing = { a: 1 };
      const newState = { a: 1, b: 2 };
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        newKeys: ['b'],
      };
      const result = mergeFixtureChanges(existing, newState, diff);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('removes missing keys', () => {
      const existing = { a: 1, b: 2 };
      const newState = { a: 1 };
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        missingKeys: ['b'],
      };
      const result = mergeFixtureChanges(existing, newState, diff);
      expect(result).toEqual({ a: 1 });
    });

    it('updates type and value mismatches', () => {
      const existing = { a: 1, b: 'old' };
      const newState = { a: 'one', b: 'new' };
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        typeMismatches: [{ key: 'a', expected: 'number', received: 'string' }],
        valueMismatches: [{ key: 'b', expected: 'old', received: 'new' }],
      };
      const result = mergeFixtureChanges(existing, newState, diff);
      expect(result).toEqual({ a: 'one', b: 'new' });
    });

    it('does not mutate the input object', () => {
      const existing = { a: 1, b: 2 };
      const copy = JSON.parse(JSON.stringify(existing));
      mergeFixtureChanges(
        existing,
        { a: 1 },
        {
          ...emptyDiff,
          missingKeys: ['b'],
        },
      );
      expect(existing).toEqual(copy);
    });

    it('sorts result keys alphabetically', () => {
      const existing = {};
      const newState = { c: 3, a: 1, b: 2 };
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        newKeys: ['c', 'a', 'b'],
      };
      const result = mergeFixtureChanges(existing, newState, diff);
      expect(Object.keys(result)).toEqual(['a', 'b', 'c']);
    });

    it('splices array elements instead of creating sparse entries', () => {
      const existing = { items: ['a', 'b', 'c'] };
      const newState = { items: ['c'] };
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        missingKeys: ['items.0', 'items.1'],
      };
      const result = mergeFixtureChanges(existing, newState, diff);
      expect(result.items).toEqual(['c']);
      // Verify no nulls from sparse array
      expect(JSON.stringify(result)).not.toContain('null');
    });

    it('handles multiple array deletions in correct descending order', () => {
      const existing = { data: { list: [10, 20, 30, 40, 50] } };
      const newState = { data: { list: [10, 40] } };
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        // Keys may arrive in any order
        missingKeys: ['data.list.1', 'data.list.4', 'data.list.2'],
      };
      const result = mergeFixtureChanges(existing, newState, diff);
      expect(result.data).toEqual({ list: [10, 40] });
    });

    it('handles nested key additions', () => {
      const existing = {};
      const newState = { a: { b: { c: 'deep' } } };
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        newKeys: ['a', 'a.b', 'a.b.c'],
      };
      const result = mergeFixtureChanges(existing, newState, diff);
      expect(result).toEqual({ a: { b: { c: 'deep' } } });
    });
  });

  describe('formatSchemaDiff', () => {
    it('returns empty string for empty diff', () => {
      expect(formatSchemaDiff(emptyDiff)).toBe('');
    });

    it('formats new keys with + prefix', () => {
      const diff: FixtureSchemaDiff = { ...emptyDiff, newKeys: ['a.b'] };
      expect(formatSchemaDiff(diff)).toContain('+ a.b');
      expect(formatSchemaDiff(diff)).toContain('New keys');
    });

    it('formats missing keys with - prefix', () => {
      const diff: FixtureSchemaDiff = { ...emptyDiff, missingKeys: ['x.y'] };
      expect(formatSchemaDiff(diff)).toContain('- x.y');
      expect(formatSchemaDiff(diff)).toContain('Missing keys');
    });

    it('formats type mismatches with ~ prefix', () => {
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        typeMismatches: [{ key: 'k', expected: 'number', received: 'string' }],
      };
      const output = formatSchemaDiff(diff);
      expect(output).toContain('~ k');
      expect(output).toContain('Type mismatches');
    });

    it('formats value mismatches with ~ prefix', () => {
      const diff: FixtureSchemaDiff = {
        ...emptyDiff,
        valueMismatches: [{ key: 'k', expected: 1, received: 2 }],
      };
      const output = formatSchemaDiff(diff);
      expect(output).toContain('~ k');
      expect(output).toContain('Value mismatches');
    });

    it('omits empty sections', () => {
      const diff: FixtureSchemaDiff = { ...emptyDiff, newKeys: ['a'] };
      const output = formatSchemaDiff(diff);
      expect(output).not.toContain('Missing keys');
      expect(output).not.toContain('Type mismatches');
      expect(output).not.toContain('Value mismatches');
    });

    it('includes update instructions when there are differences', () => {
      const diff: FixtureSchemaDiff = { ...emptyDiff, newKeys: ['a'] };
      expect(formatSchemaDiff(diff)).toContain('mergeFixtureChanges()');
    });
  });

  describe('readFixtureFile', () => {
    it('reads existing fixture file successfully', () => {
      const fixture = readFixtureFile('default-fixture.json');
      expect(fixture).toBeDefined();
      expect(fixture.state).toBeDefined();
      expect(fixture.asyncState).toBeDefined();
    });

    it('throws for missing fixture files', () => {
      expect(() => readFixtureFile('nonexistent.json')).toThrow();
    });
  });

  describe('getMobileFixtureIgnoredKeys', () => {
    it('returns a string array', () => {
      const keys = getMobileFixtureIgnoredKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
      keys.forEach((key) => expect(typeof key).toBe('string'));
    });

    it('returns a fresh instance each call', () => {
      const a = getMobileFixtureIgnoredKeys();
      const b = getMobileFixtureIgnoredKeys();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('integration: default fixture self-comparison', () => {
    it('produces empty diff when comparing fixture to itself', () => {
      const fixture = readFixtureFile('default-fixture.json');
      const state = fixture.state as Record<string, unknown>;
      const diff = computeSchemaDiff(state, state);
      expect(hasSchemaDifferences(diff)).toBe(false);
    });
  });
});
