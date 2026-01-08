import { parseCommaSeparatedString } from './stringParseUtils';

describe('parseCommaSeparatedString', () => {
  it('parses comma-separated values', () => {
    expect(parseCommaSeparatedString('xyz:*,abc:TSLA')).toEqual([
      'xyz:*',
      'abc:TSLA',
    ]);
  });

  it('parses values with spaces', () => {
    expect(parseCommaSeparatedString('xyz:*, abc:TSLA')).toEqual([
      'xyz:*',
      'abc:TSLA',
    ]);
  });

  it('trims whitespace from values', () => {
    expect(parseCommaSeparatedString('  xyz  , abc  ')).toEqual(['xyz', 'abc']);
  });

  it('filters out empty values', () => {
    expect(parseCommaSeparatedString('xyz,,abc')).toEqual(['xyz', 'abc']);
  });

  it('returns empty array for empty string', () => {
    expect(parseCommaSeparatedString('')).toEqual([]);
  });

  it('returns empty array for only whitespace', () => {
    expect(parseCommaSeparatedString('  ,  ,  ')).toEqual([]);
  });

  it('handles single value', () => {
    expect(parseCommaSeparatedString('xyz:*')).toEqual(['xyz:*']);
  });

  it('handles single value with whitespace', () => {
    expect(parseCommaSeparatedString('  xyz:*  ')).toEqual(['xyz:*']);
  });

  it('handles wildcard patterns', () => {
    expect(parseCommaSeparatedString('xyz:*, abc:*')).toEqual([
      'xyz:*',
      'abc:*',
    ]);
  });

  it('handles mixed patterns', () => {
    expect(parseCommaSeparatedString('BTC, xyz:TSLA, abc:*, ETH')).toEqual([
      'BTC',
      'xyz:TSLA',
      'abc:*',
      'ETH',
    ]);
  });
});
