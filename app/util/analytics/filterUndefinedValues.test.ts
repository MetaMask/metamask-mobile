import { filterUndefinedValues } from './filterUndefinedValues';

describe('filterUndefinedValues', () => {
  describe('filtering undefined property values', () => {
    it('removes undefined values from an object', () => {
      const input = {
        definedValue: 'test',
        undefinedValue: undefined,
        anotherDefined: 42,
      };
      const result = filterUndefinedValues(input);
      expect(result).toEqual({ definedValue: 'test', anotherDefined: 42 });
      expect(result).not.toHaveProperty('undefinedValue');
    });

    it('returns empty object when all property values are undefined', () => {
      const input = { u1: undefined, u2: undefined };
      const result = filterUndefinedValues(input);
      expect(result).toEqual({});
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('preserving valid values', () => {
    it('preserves null property values (valid in JSON)', () => {
      const input = { a: 'x', b: null, c: undefined };
      const result = filterUndefinedValues(input);
      expect(result).toEqual({ a: 'x', b: null });
    });

    it('preserves falsy but defined values (0, false, empty string)', () => {
      const input = {
        zero: 0,
        falseValue: false,
        emptyString: '',
        undefinedValue: undefined,
      };
      const result = filterUndefinedValues(input);
      expect(result).toEqual({
        zero: 0,
        falseValue: false,
        emptyString: '',
      });
    });

    it('preserves string, number, and boolean values', () => {
      const input = {
        str: 'hello',
        num: 123,
        bool: true,
        undefinedKey: undefined,
      };
      const result = filterUndefinedValues(input);
      expect(result).toEqual({ str: 'hello', num: 123, bool: true });
    });
  });

  describe('handling null/undefined input', () => {
    it('returns empty object for null input', () => {
      const result = filterUndefinedValues(
        null as unknown as Record<string, unknown>,
      );
      expect(result).toEqual({});
    });

    it('returns empty object for undefined input', () => {
      const result = filterUndefinedValues(
        undefined as unknown as Record<string, unknown>,
      );
      expect(result).toEqual({});
    });

    it('returns empty object for empty object input', () => {
      const result = filterUndefinedValues({});
      expect(result).toEqual({});
    });
  });

  describe('immutability', () => {
    it('does not mutate the input object', () => {
      const input = { a: 1, b: undefined, c: 'three' };
      const copy = { ...input };
      filterUndefinedValues(input);
      expect(input).toEqual(copy);
    });
  });
});
