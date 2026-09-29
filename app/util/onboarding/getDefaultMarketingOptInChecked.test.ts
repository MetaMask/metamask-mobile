let mockHasTestOverrides = false;

jest.mock('../region/isUsaGeolocationLocation', () => ({
  isUsaGeolocationLocation: jest.fn(),
}));

jest.mock('../test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides;
  },
}));

import { getDefaultMarketingOptInChecked } from './getDefaultMarketingOptInChecked';
import { isUsaGeolocationLocation } from '../region/isUsaGeolocationLocation';

const mockIsUsaGeolocationLocation =
  isUsaGeolocationLocation as jest.MockedFunction<
    typeof isUsaGeolocationLocation
  >;

describe('getDefaultMarketingOptInChecked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasTestOverrides = false;
  });

  it('returns false in E2E test builds regardless of region', () => {
    mockHasTestOverrides = true;
    mockIsUsaGeolocationLocation.mockReturnValue(true);

    expect(getDefaultMarketingOptInChecked(true, 'US')).toBe(false);
  });

  it('returns true for social login users in the USA', () => {
    mockIsUsaGeolocationLocation.mockReturnValue(true);

    expect(getDefaultMarketingOptInChecked(true, 'US')).toBe(true);
  });

  it('returns false for social login users outside the USA', () => {
    mockIsUsaGeolocationLocation.mockReturnValue(false);

    expect(getDefaultMarketingOptInChecked(true, 'GB')).toBe(false);
  });

  it('returns false for non-social-login users in the USA', () => {
    mockIsUsaGeolocationLocation.mockReturnValue(true);

    expect(getDefaultMarketingOptInChecked(false, 'US')).toBe(false);
  });

  it('returns false for non-social-login users outside the USA', () => {
    mockIsUsaGeolocationLocation.mockReturnValue(false);

    expect(getDefaultMarketingOptInChecked(false, 'GB')).toBe(false);
  });

  it('returns false when geolocation is unknown for social login users', () => {
    mockIsUsaGeolocationLocation.mockReturnValue(false);

    expect(getDefaultMarketingOptInChecked(true, undefined)).toBe(false);
  });
});
