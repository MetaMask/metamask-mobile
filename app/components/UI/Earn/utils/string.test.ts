import { parseCommaSeparatedString } from './string';

describe('parseCommaSeparatedString', () => {
  it('splits a comma-separated string into an array of trimmed items', () => {
    const input = '0x1,0xe708,0x8f';

    const result = parseCommaSeparatedString(input);

    expect(result).toEqual(['0x1', '0xe708', '0x8f']);
  });

  it('trims leading and trailing whitespace from each item', () => {
    const input = '0x1, 0xe708, 0x8f';

    const result = parseCommaSeparatedString(input);

    expect(result).toEqual(['0x1', '0xe708', '0x8f']);
  });

  it('returns a single-element array when the string contains no comma', () => {
    const input = '0x1';

    const result = parseCommaSeparatedString(input);

    expect(result).toEqual(['0x1']);
  });

  it('returns an empty array for an empty string', () => {
    const input = '';

    const result = parseCommaSeparatedString(input);

    expect(result).toEqual([]);
  });

  it('filters out empty segments produced by consecutive commas', () => {
    const input = '0x1,,0xe708';

    const result = parseCommaSeparatedString(input);

    expect(result).toEqual(['0x1', '0xe708']);
  });

  it('filters out segments that are whitespace-only', () => {
    const input = '0x1,   ,0xe708';

    const result = parseCommaSeparatedString(input);

    expect(result).toEqual(['0x1', '0xe708']);
  });

  it('returns an empty array when the string contains only commas', () => {
    const input = ',,,';

    const result = parseCommaSeparatedString(input);

    expect(result).toEqual([]);
  });

  it('preserves the original order of items', () => {
    const input = '0x8f,0x1,0xe708';

    const result = parseCommaSeparatedString(input);

    expect(result).toEqual(['0x8f', '0x1', '0xe708']);
  });
});
