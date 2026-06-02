import formattedDeeplinkParsedValue from './formattedDeeplinkParsedValue';

describe('formattedDeeplinkParsedValue', () => {
  it.each([
    ['1e+21', '1000000000000000000000'],
    ['1.234e+17', '123400000000000000'],
    ['1.4e+18', '1400000000000000000'],
    ['1.6e+21', '1600000000000000000000'],
    ['4.2e+17', '420000000000000000'],
    ['1000000', '1000000'],
  ])('converts %s to %s', (input, expected) => {
    expect(formattedDeeplinkParsedValue(input)).toEqual(expected);
  });
});
