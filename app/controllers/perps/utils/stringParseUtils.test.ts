import { stripQuotes, parseCommaSeparatedString } from './stringParseUtils';

describe('stripQuotes', () => {
  it('removes single layer of double quotes', () => {
    expect(stripQuotes('"hello"')).toBe('hello');
  });

  it('removes single layer of single quotes', () => {
    expect(stripQuotes("'hello'")).toBe('hello');
  });

  it('removes nested quotes (single wrapping double)', () => {
    // Simulates LaunchDarkly returning '"xyz:TSLA"' (single quotes wrapping double quotes)
    expect(stripQuotes(`'"xyz:TSLA"'`)).toBe('xyz:TSLA');
  });

  it('removes multiple layers of double quotes', () => {
    expect(stripQuotes('""xyz""')).toBe('xyz');
  });

  it('removes mixed nested quotes (double wrapping single)', () => {
    expect(stripQuotes(`"'xyz'"`)).toBe('xyz');
  });

  it('returns string unchanged when no wrapping quotes', () => {
    expect(stripQuotes('hello')).toBe('hello');
  });

  it('returns empty string unchanged', () => {
    expect(stripQuotes('')).toBe('');
  });

  it('does not remove mismatched quotes', () => {
    expect(stripQuotes(`"hello'`)).toBe(`"hello'`);
  });

  it('does not remove quotes in the middle', () => {
    expect(stripQuotes('hel"lo')).toBe('hel"lo');
  });

  it('handles deeply nested single quotes', () => {
    expect(stripQuotes(`'''xyz'''`)).toBe('xyz');
  });

  it('handles real LaunchDarkly pattern with nested quotes', () => {
    // The actual problematic value: single-quote wrapped double-quoted string
    expect(stripQuotes(`'"xyz:TSLA"'`)).toBe('xyz:TSLA');
  });
});

describe('parseCommaSeparatedString', () => {
  it('parses comma-separated values', () => {
    expect(parseCommaSeparatedString('BTC,ETH,SOL')).toEqual([
      'BTC',
      'ETH',
      'SOL',
    ]);
  });

  it('trims whitespace', () => {
    expect(parseCommaSeparatedString(' BTC , ETH , SOL ')).toEqual([
      'BTC',
      'ETH',
      'SOL',
    ]);
  });

  it('filters empty values', () => {
    expect(parseCommaSeparatedString('BTC,,SOL')).toEqual(['BTC', 'SOL']);
  });

  it('returns empty array for empty string', () => {
    expect(parseCommaSeparatedString('')).toEqual([]);
  });
});
