import { getCountry } from 'react-native-localize';
import { isUsaDeviceRegion } from './isUsaDeviceRegion';

jest.mock('react-native-localize', () => ({
  getCountry: jest.fn(),
}));

const mockGetCountry = getCountry as jest.MockedFunction<typeof getCountry>;

describe('isUsaDeviceRegion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when device region is US', () => {
    mockGetCountry.mockReturnValue('US');

    expect(isUsaDeviceRegion()).toBe(true);
  });

  it('returns true when device region is us (lowercase)', () => {
    mockGetCountry.mockReturnValue('us');

    expect(isUsaDeviceRegion()).toBe(true);
  });

  it('returns false when device region is GB', () => {
    mockGetCountry.mockReturnValue('GB');

    expect(isUsaDeviceRegion()).toBe(false);
  });

  it('returns false when device region is unavailable', () => {
    mockGetCountry.mockReturnValue('');

    expect(isUsaDeviceRegion()).toBe(false);
  });

  it('returns false when getCountry throws', () => {
    mockGetCountry.mockImplementation(() => {
      throw new Error('native module unavailable');
    });

    expect(isUsaDeviceRegion()).toBe(false);
  });
});
