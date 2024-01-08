import formattedDeeplinkParsedValue from './formattedDeeplinkParsedValue';

describe('formattedDeeplinkParsedValue', () => {
  it('should format the value', () => {
    expect(formattedDeeplinkParsedValue('1.234e+17')).toEqual(
      '123400000000000000',
    );
    expect(formattedDeeplinkParsedValue('1e+21')).toEqual(
      '1000000000000000000000',
    );
    expect(formattedDeeplinkParsedValue('1.4e+18')).toEqual(
      '1400000000000000000',
    );
    expect(formattedDeeplinkParsedValue('1.6e+21')).toEqual(
      '1600000000000000000000',
    );
    expect(formattedDeeplinkParsedValue('4.2e+17')).toEqual(
      '420000000000000000',
    );
  });
});
