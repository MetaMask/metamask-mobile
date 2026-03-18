import { string, number, defaulted, object } from '@metamask/superstruct';
import { parse } from './utils';
import { HexSchema } from './common';

describe('parse', () => {
  describe('with valid values', () => {
    it('returns the parsed value for a matching string schema', () => {
      const input = 'hello';

      const result = parse(input, string());

      expect(result).toBe('hello');
    });

    it('returns the parsed value for a matching number schema', () => {
      const input = 42;

      const result = parse(input, number());

      expect(result).toBe(42);
    });

    it('returns the parsed value for a custom Hex schema', () => {
      const input = '0xabc';

      const result = parse(input, HexSchema);

      expect(result).toBe('0xabc');
    });

    it('applies schema defaults for missing fields', () => {
      const schema = object({
        name: defaulted(string(), () => 'default-name'),
        count: defaulted(number(), () => 0),
      });

      const result = parse({}, schema);

      expect(result).toStrictEqual({ name: 'default-name', count: 0 });
    });
  });

  describe('without defaultValue', () => {
    it('throws with wrapped message for type mismatch', () => {
      const input = 123;

      expect(() => parse(input, string())).toThrow('Invalid value:');
    });

    it('throws with wrapped message for null input', () => {
      const input = null;

      expect(() => parse(input, string())).toThrow('Invalid value:');
    });

    it('throws with wrapped message for failing custom schema', () => {
      const input = 'not-hex';

      expect(() => parse(input, HexSchema)).toThrow('Invalid value:');
    });
  });

  describe('with defaultValue', () => {
    it('returns defaultValue when validation fails', () => {
      const input = 'not-a-number';

      const result = parse(input, number(), 99);

      expect(result).toBe(99);
    });

    it('returns defaultValue for null input', () => {
      const result = parse(null, string(), 'fallback');

      expect(result).toBe('fallback');
    });

    it('returns defaultValue for undefined input', () => {
      const result = parse(undefined, number(), -1);

      expect(result).toBe(-1);
    });

    it('returns parsed value when validation passes despite defaultValue being provided', () => {
      const input = 'valid';

      const result = parse(input, string(), 'fallback');

      expect(result).toBe('valid');
    });

    it('returns defaultValue for a failing custom Hex schema', () => {
      const input = 'no-prefix';

      const result = parse(input, HexSchema, '0x0' as `0x${string}`);

      expect(result).toBe('0x0');
    });
  });
});
