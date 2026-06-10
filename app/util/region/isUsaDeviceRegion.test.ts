import { isUsaDeviceRegion } from './isUsaDeviceRegion';

describe('isUsaDeviceRegion', () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;

  afterEach(() => {
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  const mockDeviceLocale = (locale: string) => {
    Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
      resolvedOptions: () => ({ locale }),
    })) as unknown as typeof Intl.DateTimeFormat;
  };

  it('returns true for en-US locale', () => {
    mockDeviceLocale('en-US');

    expect(isUsaDeviceRegion()).toBe(true);
  });

  it('returns true for es-US locale', () => {
    mockDeviceLocale('es-US');

    expect(isUsaDeviceRegion()).toBe(true);
  });

  it('returns true for en_US locale with underscore separator', () => {
    mockDeviceLocale('en_US');

    expect(isUsaDeviceRegion()).toBe(true);
  });

  it('returns false for en-GB locale', () => {
    mockDeviceLocale('en-GB');

    expect(isUsaDeviceRegion()).toBe(false);
  });

  it('returns false when locale has no region subtag', () => {
    mockDeviceLocale('en');

    expect(isUsaDeviceRegion()).toBe(false);
  });

  it('returns false when Intl.DateTimeFormat throws', () => {
    Intl.DateTimeFormat = jest.fn().mockImplementation(() => {
      throw new Error('Intl unavailable');
    }) as unknown as typeof Intl.DateTimeFormat;

    expect(isUsaDeviceRegion()).toBe(false);
  });
});
