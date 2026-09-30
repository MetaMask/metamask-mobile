import { splitNumericString } from './splitNumericString';

describe('splitNumericString', () => {
  it('splits a leading currency symbol into the prefix', () => {
    const result = splitNumericString('$ 4500.00');

    expect(result).toEqual({
      prefix: '$ ',
      numeric: '4500.00',
      suffix: '',
    });
  });

  it('splits trailing label text into the suffix', () => {
    const result = splitNumericString('$ 250.00 available');

    expect(result).toEqual({
      prefix: '$ ',
      numeric: '250.00',
      suffix: ' available',
    });
  });

  it('splits a trailing ticker into the suffix', () => {
    const result = splitNumericString('0.0025 ETH available');

    expect(result).toEqual({
      prefix: '',
      numeric: '0.0025',
      suffix: ' ETH available',
    });
  });

  it('keeps a ticker containing digits intact in the suffix', () => {
    const result = splitNumericString('5 1INCH');

    expect(result).toEqual({
      prefix: '',
      numeric: '5',
      suffix: ' 1INCH',
    });
  });

  it('keeps a half-typed trailing decimal in the numeric run', () => {
    const result = splitNumericString('12.');

    expect(result).toEqual({
      prefix: '',
      numeric: '12.',
      suffix: '',
    });
  });

  it('keeps grouping spaces in the numeric run', () => {
    const result = splitNumericString('1 234.56');

    expect(result).toEqual({
      prefix: '',
      numeric: '1 234.56',
      suffix: '',
    });
  });

  it.each(['1\u00A0234,56', '1\u202F234,56'])(
    'keeps locale grouping whitespace in the numeric run',
    (value) => {
      const result = splitNumericString(value);

      expect(result).toEqual({
        prefix: '',
        numeric: value,
        suffix: '',
      });
    },
  );

  it.each(["1'234.56", '1’234.56'])(
    'keeps apostrophe grouping in the numeric run',
    (value) => {
      const result = splitNumericString(value);

      expect(result).toEqual({
        prefix: '',
        numeric: value,
        suffix: '',
      });
    },
  );

  it('keeps signs and currency symbols in the prefix', () => {
    const result = splitNumericString('-$1,234.56');

    expect(result).toEqual({
      prefix: '-$',
      numeric: '1,234.56',
      suffix: '',
    });
  });

  it('keeps decimal-comma formatting in the numeric run', () => {
    const result = splitNumericString('€1.234,56');

    expect(result).toEqual({
      prefix: '€',
      numeric: '1.234,56',
      suffix: '',
    });
  });

  it('treats a string without digits as prefix text', () => {
    const result = splitNumericString('--');

    expect(result).toEqual({
      prefix: '--',
      numeric: '',
      suffix: '',
    });
  });
});
