import { getPerpsConversionScreenOptions } from './index';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const baseOptions = {
  title: 'perps.close_position.title',
  headerShown: false,
};

describe('getPerpsConversionScreenOptions', () => {
  it('clears the stack animation for the sheet so only the sheet animates', () => {
    const options = getPerpsConversionScreenOptions(true, baseOptions);

    expect(options.animation).toBe('none');
    expect(options.presentation).toBe('transparentModal');
    expect(options.headerShown).toBe(false);
    expect(options.title).toBe('perps.close_position.title');
  });

  it('keeps the base options untouched for the full-screen variant', () => {
    const options = getPerpsConversionScreenOptions(false, baseOptions);

    expect(options).toStrictEqual(baseOptions);
    expect(options.animation).toBeUndefined();
    expect(options.presentation).toBeUndefined();
  });
});
