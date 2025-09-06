import { renderHook } from '@testing-library/react-hooks';
import { useDefaultRegion } from './useDefaultRegion';
import { DepositSDKNoAuth } from '../sdk';

jest.mock('../sdk', () => ({
  DepositSDKNoAuth: {
    getGeolocation: jest.fn(),
    getCountries: jest.fn(),
  },
}));

const mockGetGeolocation =
  DepositSDKNoAuth.getGeolocation as jest.MockedFunction<
    typeof DepositSDKNoAuth.getGeolocation
  >;
const mockGetCountries = DepositSDKNoAuth.getCountries as jest.MockedFunction<
  typeof DepositSDKNoAuth.getCountries
>;

const mockRegions = [
  {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phone: {
      prefix: '+1',
      placeholder: '123-456-7890',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'USD',
    supported: true,
    recommended: true,
  },
  {
    isoCode: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    phone: {
      prefix: '+49',
      placeholder: '123 456 7890',
      template: 'XXX XXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    phone: {
      prefix: '+1',
      placeholder: '123-456-7890',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'CAD',
    supported: false,
  },
];

describe('useDefaultRegion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return matched region based on geolocation', async () => {
    mockGetCountries.mockResolvedValue(mockRegions);
    mockGetGeolocation.mockResolvedValue({
      ipCountryCode: 'DE',
    });

    const { result, waitForNextUpdate } = renderHook(() => useDefaultRegion());

    await waitForNextUpdate();

    expect(result.current.defaultRegion?.isoCode).toBe('DE');
    expect(result.current.error).toBe(null);
  });

  it('should fallback to US region when geolocation match not found', async () => {
    mockGetCountries.mockResolvedValue(mockRegions);
    mockGetGeolocation.mockResolvedValue({
      ipCountryCode: 'FR', // Not in our mock regions
    });

    const { result, waitForNextUpdate } = renderHook(() => useDefaultRegion());

    await waitForNextUpdate();

    expect(result.current.defaultRegion?.isoCode).toBe('US');
    expect(result.current.error).toBe(null);
  });

  it('should fallback to first supported region when US not available', async () => {
    const regionsWithoutUS = mockRegions.filter((r) => r.isoCode !== 'US');

    mockGetCountries.mockResolvedValue(regionsWithoutUS);
    mockGetGeolocation.mockResolvedValue({
      ipCountryCode: 'FR',
    });

    const { result, waitForNextUpdate } = renderHook(() => useDefaultRegion());

    await waitForNextUpdate();

    expect(result.current.defaultRegion?.isoCode).toBe('DE');
    expect(result.current.error).toBe(null);
  });

  it('should skip unsupported regions in geolocation matching', async () => {
    mockGetCountries.mockResolvedValue(mockRegions);
    mockGetGeolocation.mockResolvedValue({
      ipCountryCode: 'CA', // Canada is unsupported in our mock
    });

    const { result, waitForNextUpdate } = renderHook(() => useDefaultRegion());

    await waitForNextUpdate();

    expect(result.current.defaultRegion?.isoCode).toBe('US'); // Fallback to US
    expect(result.current.error).toBe(null);
  });

  it('should show loading state while fetching regions and geolocation', () => {
    // Don't resolve promises to keep loading state
    mockGetCountries.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );
    mockGetGeolocation.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );

    const { result } = renderHook(() => useDefaultRegion());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.defaultRegion).toBe(null);
  });

  it('should handle geolocation error gracefully', async () => {
    mockGetCountries.mockResolvedValue(mockRegions);
    mockGetGeolocation.mockRejectedValue(new Error('Geolocation failed'));

    const { result, waitForNextUpdate } = renderHook(() => useDefaultRegion());

    await waitForNextUpdate();

    expect(result.current.defaultRegion?.isoCode).toBe('US'); // Should still fallback to US
    expect(result.current.error).toBe('Geolocation failed');
  });

  it('should return null when no regions available', async () => {
    mockGetCountries.mockResolvedValue([]);
    mockGetGeolocation.mockResolvedValue({
      ipCountryCode: 'US',
    });

    const { result, waitForNextUpdate } = renderHook(() => useDefaultRegion());

    await waitForNextUpdate();

    expect(result.current.defaultRegion).toBe(null);
  });

  it('should handle regions error', async () => {
    mockGetCountries.mockRejectedValue(new Error('Failed to fetch regions'));
    mockGetGeolocation.mockResolvedValue({
      ipCountryCode: 'US',
    });

    const { result, waitForNextUpdate } = renderHook(() => useDefaultRegion());

    await waitForNextUpdate();

    expect(result.current.error).toBe('Failed to fetch regions');
  });
});
