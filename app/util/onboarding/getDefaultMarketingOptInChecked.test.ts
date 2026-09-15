let mockHasTestOverrides = false;

jest.mock('../region/isEuGeolocationLocation', () => ({
  isEuGeolocationLocation: jest.fn(),
}));

jest.mock('../test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides;
  },
}));

import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { getDefaultMarketingOptInChecked } from './getDefaultMarketingOptInChecked';
import { isEuGeolocationLocation } from '../region/isEuGeolocationLocation';

const mockIsEuGeolocationLocation =
  isEuGeolocationLocation as jest.MockedFunction<
    typeof isEuGeolocationLocation
  >;

describe('getDefaultMarketingOptInChecked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasTestOverrides = false;
  });

  it('returns false in E2E test builds regardless of region', () => {
    mockHasTestOverrides = true;
    mockIsEuGeolocationLocation.mockReturnValue(false);

    expect(getDefaultMarketingOptInChecked('US')).toBe(false);
  });

  it('returns true for non-EU locations including the US and GB', () => {
    mockIsEuGeolocationLocation.mockReturnValue(false);

    expect(getDefaultMarketingOptInChecked('US')).toBe(true);
    expect(getDefaultMarketingOptInChecked('GB')).toBe(true);
  });

  it('returns false for EU locations', () => {
    mockIsEuGeolocationLocation.mockReturnValue(true);

    expect(getDefaultMarketingOptInChecked('DE')).toBe(false);
  });

  it('returns false when geolocation is unknown', () => {
    mockIsEuGeolocationLocation.mockReturnValue(false);

    expect(getDefaultMarketingOptInChecked(undefined)).toBe(false);
    expect(getDefaultMarketingOptInChecked(UNKNOWN_LOCATION)).toBe(false);
  });
});
