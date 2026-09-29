import { getTpslOptions } from './index';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('getTpslOptions', () => {
  it('clears the stack animation for the sheet so only the sheet animates', () => {
    const options = getTpslOptions(true);

    expect(options.animation).toBe('none');
    expect(options.presentation).toBe('transparentModal');
    expect(options.title).toBe('perps.tpsl.title');
  });

  it('keeps the stack transition for the full-screen variant', () => {
    const options = getTpslOptions(false);

    expect(options.animation).not.toBe('none');
    expect(options.presentation).toBe('transparentModal');
    expect(options.headerShown).toBe(false);
  });

  it('treats an absent flag as the full-screen variant', () => {
    expect(getTpslOptions(undefined)).toStrictEqual(getTpslOptions(false));
  });
});
