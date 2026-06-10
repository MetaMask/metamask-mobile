import { getDefaultMarketingOptInChecked } from './getDefaultMarketingOptInChecked';
import { isUsaDeviceRegion } from '../region/isUsaDeviceRegion';

jest.mock('../region/isUsaDeviceRegion', () => ({
  isUsaDeviceRegion: jest.fn(),
}));

const mockIsUsaDeviceRegion = isUsaDeviceRegion as jest.MockedFunction<
  typeof isUsaDeviceRegion
>;

describe('getDefaultMarketingOptInChecked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for social login users in the USA', () => {
    mockIsUsaDeviceRegion.mockReturnValue(true);

    expect(getDefaultMarketingOptInChecked(true)).toBe(true);
  });

  it('returns false for social login users outside the USA', () => {
    mockIsUsaDeviceRegion.mockReturnValue(false);

    expect(getDefaultMarketingOptInChecked(true)).toBe(false);
  });

  it('returns false for non-social-login users in the USA', () => {
    mockIsUsaDeviceRegion.mockReturnValue(true);

    expect(getDefaultMarketingOptInChecked(false)).toBe(false);
  });

  it('returns false for non-social-login users outside the USA', () => {
    mockIsUsaDeviceRegion.mockReturnValue(false);

    expect(getDefaultMarketingOptInChecked(false)).toBe(false);
  });
});
