export const getLocales = jest.fn(
  () =>
    [
      {
        languageTag: 'en-US',
        languageCode: 'en',
        languageScriptCode: null,
        regionCode: 'US',
        languageRegionCode: 'US',
        textDirection: 'ltr',
        digitGroupingSeparator: ',',
        decimalSeparator: '.',
        measurementSystem: 'metric',
        currencyCode: 'USD',
        currencySymbol: '$',
        languageCurrencyCode: 'USD',
        languageCurrencySymbol: '$',
        temperatureUnit: 'fahrenheit',
      },
    ] as const,
);

export default {
  getLocales,
};
