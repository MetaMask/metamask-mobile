import { getNestedProperty } from './getNestedProperty';

describe('getNestedProperty', () => {
  it('returns a top-level property', () => {
    expect(getNestedProperty({ foo: 'bar' }, 'foo')).toBe('bar');
  });

  it('returns a nested property', () => {
    expect(getNestedProperty({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns default "N/A" for missing paths', () => {
    expect(getNestedProperty({ a: 1 }, 'b')).toBe('N/A');
    expect(getNestedProperty({ a: { b: 1 } }, 'a.c')).toBe('N/A');
  });

  it('returns custom default value when path is missing', () => {
    expect(getNestedProperty({}, 'x.y', 0)).toBe(0);
    expect(getNestedProperty({}, 'x', 'fallback')).toBe('fallback');
  });

  it('returns default for null, undefined, and primitive objects', () => {
    expect(getNestedProperty(null, 'a')).toBe('N/A');
    expect(getNestedProperty(undefined, 'a')).toBe('N/A');
    expect(getNestedProperty('string' as unknown, 'a')).toBe('N/A');
    expect(getNestedProperty(42 as unknown, 'a')).toBe('N/A');
  });

  it('handles value 0 without falling through to default', () => {
    expect(getNestedProperty({ count: 0 }, 'count')).toBe(0);
  });

  it('handles empty string without falling through to default', () => {
    expect(getNestedProperty({ name: '' }, 'name')).toBe('');
  });

  it('returns default when intermediate key is null', () => {
    expect(getNestedProperty({ a: null }, 'a.b')).toBe('N/A');
  });

  it('returns default when intermediate key is undefined', () => {
    expect(getNestedProperty({ a: undefined }, 'a.b')).toBe('N/A');
  });

  it('returns default when leaf value is null', () => {
    expect(getNestedProperty({ a: { b: null } }, 'a.b')).toBe('N/A');
  });

  it('returns default when leaf value is undefined', () => {
    expect(getNestedProperty({ a: { b: undefined } }, 'a.b')).toBe('N/A');
  });
});
