import { mapEqual } from './mapEqual';

describe('mapEqual', () => {
  describe('equal Maps', () => {
    it('returns true for two empty Maps', () => {
      const map1 = new Map();
      const map2 = new Map();

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns true for Maps with same string values', () => {
      const map1 = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const map2 = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns true for Maps with same number values', () => {
      const map1 = new Map([
        ['key1', 100],
        ['key2', 200],
      ]);
      const map2 = new Map([
        ['key1', 100],
        ['key2', 200],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns true for Maps with same object references', () => {
      const obj1 = { name: 'test1' };
      const obj2 = { name: 'test2' };
      const map1 = new Map([
        ['key1', obj1],
        ['key2', obj2],
      ]);
      const map2 = new Map([
        ['key1', obj1],
        ['key2', obj2],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns true for Maps with single entry', () => {
      const map1 = new Map([['only-key', 'only-value']]);
      const map2 = new Map([['only-key', 'only-value']]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns true for Maps with null values', () => {
      const map1 = new Map([
        ['key1', null],
        ['key2', null],
      ]);
      const map2 = new Map([
        ['key1', null],
        ['key2', null],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns true for Maps with undefined values', () => {
      const map1 = new Map([
        ['key1', undefined],
        ['key2', undefined],
      ]);
      const map2 = new Map([
        ['key1', undefined],
        ['key2', undefined],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns true for Maps with boolean values', () => {
      const map1 = new Map([
        ['key1', true],
        ['key2', false],
      ]);
      const map2 = new Map([
        ['key1', true],
        ['key2', false],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns true for Maps with mixed value types', () => {
      type MixedValue = string | number | boolean | null | { test: string };
      const obj = { test: 'value' };
      const map1 = new Map<string, MixedValue>([
        ['key1', 'string'],
        ['key2', 123],
        ['key3', true],
        ['key4', null],
        ['key5', obj],
      ]);
      const map2 = new Map<string, MixedValue>([
        ['key1', 'string'],
        ['key2', 123],
        ['key3', true],
        ['key4', null],
        ['key5', obj],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });
  });

  describe('different sizes', () => {
    it('returns false when first Map is empty and second has entries', () => {
      const map1 = new Map();
      const map2 = new Map([['key1', 'value1']]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when second Map is empty and first has entries', () => {
      const map1 = new Map([['key1', 'value1']]);
      const map2 = new Map();

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when first Map is larger', () => {
      const map1 = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);
      const map2 = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when second Map is larger', () => {
      const map1 = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const map2 = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });
  });

  describe('different keys', () => {
    it('returns false when Maps have different keys but same size', () => {
      const map1 = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const map2 = new Map([
        ['key1', 'value1'],
        ['key3', 'value2'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when all keys are different', () => {
      const map1 = new Map([
        ['keyA', 'value'],
        ['keyB', 'value'],
      ]);
      const map2 = new Map([
        ['keyX', 'value'],
        ['keyY', 'value'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when key exists in first Map but not in second', () => {
      const map1 = new Map([['missing-key', 'value']]);
      const map2 = new Map([['different-key', 'value']]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });
  });

  describe('different values', () => {
    it('returns false when Maps have same keys but different string values', () => {
      const map1 = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const map2 = new Map([
        ['key1', 'value1'],
        ['key2', 'different-value'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when Maps have same keys but different number values', () => {
      const map1 = new Map([['key1', 100]]);
      const map2 = new Map([['key1', 200]]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when Maps have same keys but different object references', () => {
      const obj1 = { name: 'test' };
      const obj2 = { name: 'test' };
      const map1 = new Map([['key1', obj1]]);
      const map2 = new Map([['key1', obj2]]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when one value is null and other is undefined', () => {
      const map1 = new Map([['key1', null]]);
      const map2 = new Map([['key1', undefined]]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when one value is 0 and other is false', () => {
      const map1: Map<string, number | boolean> = new Map([['key1', 0]]);
      const map2: Map<string, number | boolean> = new Map([['key1', false]]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when one value is empty string and other is undefined', () => {
      const map1 = new Map([['key1', '']]);
      const map2 = new Map([['key1', undefined]]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('returns false when only one value differs in multi-entry Map', () => {
      const map1 = new Map([
        ['key1', 'same'],
        ['key2', 'same'],
        ['key3', 'different1'],
      ]);
      const map2 = new Map([
        ['key1', 'same'],
        ['key2', 'same'],
        ['key3', 'different2'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns true when comparing Map to itself', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      const result = mapEqual(map, map);

      expect(result).toBe(true);
    });

    it('returns true for large Maps with many entries', () => {
      const entries: [string, number][] = [];
      for (let i = 0; i < 1000; i++) {
        entries.push([`key${i}`, i]);
      }
      const map1 = new Map(entries);
      const map2 = new Map(entries);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns false for large Maps with one different entry', () => {
      const entries1: [string, number][] = [];
      const entries2: [string, number][] = [];
      for (let i = 0; i < 1000; i++) {
        entries1.push([`key${i}`, i]);
        entries2.push([`key${i}`, i === 500 ? 999 : i]);
      }
      const map1 = new Map(entries1);
      const map2 = new Map(entries2);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });

    it('handles Maps with number keys', () => {
      const map1 = new Map([
        [1, 'value1'],
        [2, 'value2'],
      ]);
      const map2 = new Map([
        [1, 'value1'],
        [2, 'value2'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('handles Maps with object keys', () => {
      const keyObj1 = { id: 1 };
      const keyObj2 = { id: 2 };
      const map1 = new Map([
        [keyObj1, 'value1'],
        [keyObj2, 'value2'],
      ]);
      const map2 = new Map([
        [keyObj1, 'value1'],
        [keyObj2, 'value2'],
      ]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('returns false for Maps with different object keys even if structurally equal', () => {
      const keyObj1 = { id: 1 };
      const keyObj2 = { id: 1 };
      const map1 = new Map([[keyObj1, 'value']]);
      const map2 = new Map([[keyObj2, 'value']]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(false);
    });
  });

  describe('type safety', () => {
    it('works with Maps of strings', () => {
      const map1: Map<string, string> = new Map([['key', 'value']]);
      const map2: Map<string, string> = new Map([['key', 'value']]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('works with Maps of numbers', () => {
      const map1: Map<number, number> = new Map([[1, 100]]);
      const map2: Map<number, number> = new Map([[1, 100]]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });

    it('works with Maps of objects', () => {
      interface TestObj {
        name: string;
        value: number;
      }
      const obj: TestObj = { name: 'test', value: 123 };
      const map1: Map<string, TestObj> = new Map([['key', obj]]);
      const map2: Map<string, TestObj> = new Map([['key', obj]]);

      const result = mapEqual(map1, map2);

      expect(result).toBe(true);
    });
  });
});
