import type { Country, UserRegion } from '@metamask/ramps-controller';
import { isRampRegionDefinitivelyUnsupported } from './rampRegionEligibility';

function createUserRegion(overrides: Partial<UserRegion> = {}): UserRegion {
  return {
    country: {
      isoCode: 'US',
      name: 'United States',
      flag: '',
      phone: '',
      currency: 'USD',
      supported: { buy: true, sell: true },
    },
    state: null,
    ...overrides,
  } as UserRegion;
}

function createCountry(overrides: Partial<Country> = {}): Country {
  return {
    isoCode: 'US',
    name: 'United States',
    flag: '',
    phone: '',
    currency: 'USD',
    supported: { buy: true, sell: true },
    ...overrides,
  } as Country;
}

describe('isRampRegionDefinitivelyUnsupported', () => {
  it('returns false when user region is not resolved', () => {
    expect(isRampRegionDefinitivelyUnsupported(null, [])).toBe(false);
  });

  it('returns true when state-level buy support is false', () => {
    const userRegion = createUserRegion({
      state: {
        name: 'New York',
        supported: { buy: false, sell: true },
      } as UserRegion['state'],
    });

    expect(isRampRegionDefinitivelyUnsupported(userRegion, [])).toBe(true);
  });

  it('returns true when country-level buy support is false', () => {
    const userRegion = createUserRegion({
      country: createCountry({ supported: { buy: false, sell: true } }),
    });

    expect(isRampRegionDefinitivelyUnsupported(userRegion, [])).toBe(true);
  });

  it('returns false when support flags indicate buy is supported', () => {
    const userRegion = createUserRegion();

    expect(
      isRampRegionDefinitivelyUnsupported(userRegion, [
        createCountry({ isoCode: 'CA' }),
      ]),
    ).toBe(false);
  });

  it('returns true when loaded countries list excludes the user country', () => {
    const userRegion = createUserRegion({
      country: createCountry({ supported: undefined }),
    });

    expect(
      isRampRegionDefinitivelyUnsupported(userRegion, [
        createCountry({ isoCode: 'CA' }),
      ]),
    ).toBe(true);
  });

  it('returns false when countries list is empty and support flags are absent', () => {
    const userRegion = createUserRegion({
      country: createCountry({ supported: undefined }),
    });

    expect(isRampRegionDefinitivelyUnsupported(userRegion, [])).toBe(false);
  });

  it('returns true when matched country explicitly disables buy', () => {
    const userRegion = createUserRegion({
      country: createCountry({ supported: undefined }),
    });

    expect(
      isRampRegionDefinitivelyUnsupported(userRegion, [
        createCountry({ isoCode: 'US', supported: { buy: false, sell: true } }),
      ]),
    ).toBe(true);
  });
});
