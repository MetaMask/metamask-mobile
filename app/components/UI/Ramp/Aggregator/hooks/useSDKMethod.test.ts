import { renderHook, act } from '@testing-library/react-hooks';
import useSDKMethod from './useSDKMethod';

jest.mock('@consensys/on-ramp-sdk', () => {
  // RegionsService must be a constructor so that RegionsService.prototype[method]
  // is accessible inside hasAllParams(), which passes it to SDK.getSignature().
  function MockRegionsServiceClass() {}
  MockRegionsServiceClass.prototype.getCountries = jest.fn();
  MockRegionsServiceClass.prototype.getDefaultFiatCurrency = jest.fn();

  return {
    RegionsService: MockRegionsServiceClass,
    ServicesSignatures: {
      RegionsService: {
        getCountries: { parameters: [] },
        getDefaultFiatCurrency: {
          parameters: [{ required: true }],
        },
      },
    },
  };
});

// A stable sdk object shared across all renders prevents useCallback from
// treating sdk as a changed dep on every re-render. Defined inside the factory
// so the real ../sdk module (which bootstraps the OnRamp SDK) is never loaded.
jest.mock('../sdk', () => {
  const stableSdk = {
    getCountries: jest.fn(),
    getDefaultFiatCurrency: jest.fn(),
  };
  return {
    useRampSDK: () => ({ sdk: stableSdk }),
    SDK: {
      getSignature: jest.fn().mockReturnValue({ parameters: [] }),
    },
  };
});

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Retrieve mock function references after jest.mock factories have executed
const mockSdkGetCountries = (
  jest.requireMock('../sdk') as { useRampSDK: () => { sdk: { getCountries: jest.Mock } } }
).useRampSDK().sdk.getCountries;

describe('useSDKMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query stability with unchanged args', () => {
    it('returns the same query reference across re-renders when params are unchanged', () => {
      const { result, rerender } = renderHook(() =>
        useSDKMethod({ method: 'getCountries', onMount: false }),
      );

      const firstQuery = result.current[1];

      rerender();

      const secondQuery = result.current[1];

      expect(firstQuery).toBe(secondQuery);
    });

    it('returns the same query reference across re-renders when string params are unchanged', () => {
      const { result, rerender } = renderHook(() =>
        useSDKMethod(
          { method: 'getDefaultFiatCurrency', onMount: false },
          '/regions/cl',
        ),
      );

      const firstQuery = result.current[1];

      rerender();

      const secondQuery = result.current[1];

      expect(firstQuery).toBe(secondQuery);
    });

    it('returns a new query reference when params change', () => {
      let regionParam = '/regions/cl';

      const { result, rerender } = renderHook(() =>
        useSDKMethod(
          { method: 'getDefaultFiatCurrency', onMount: false },
          regionParam,
        ),
      );

      const firstQuery = result.current[1];

      regionParam = '/regions/ar';
      rerender();

      const secondQuery = result.current[1];

      expect(firstQuery).not.toBe(secondQuery);
    });

    it('JSON.stringify is called once per render, not multiple times per render', () => {
      const stringifySpy = jest.spyOn(JSON, 'stringify');

      const { rerender } = renderHook(() =>
        useSDKMethod(
          { method: 'getDefaultFiatCurrency', onMount: false },
          '/regions/cl',
        ),
      );

      const callsAfterFirstRender = stringifySpy.mock.calls.length;
      expect(callsAfterFirstRender).toBeGreaterThanOrEqual(1);

      stringifySpy.mockClear();

      rerender();

      // JSON.stringify is called exactly once per render for stringifiedParams
      expect(stringifySpy).toHaveBeenCalledTimes(1);

      stringifySpy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('returns initial state with isFetching true when onMount is true', () => {
      const { result } = renderHook(() => useSDKMethod('getCountries'));

      expect(result.current[0].isFetching).toBe(true);
      expect(result.current[0].data).toBeNull();
      expect(result.current[0].error).toBeNull();
    });

    it('returns initial state with isFetching false when onMount is false', () => {
      const { result } = renderHook(() =>
        useSDKMethod({ method: 'getCountries', onMount: false }),
      );

      expect(result.current[0].isFetching).toBe(false);
      expect(result.current[0].data).toBeNull();
      expect(result.current[0].error).toBeNull();
    });
  });

  describe('query function', () => {
    it('returns data when the SDK call succeeds', async () => {
      const mockData = [{ id: 'country-1' }];
      mockSdkGetCountries.mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useSDKMethod({ method: 'getCountries', onMount: false }),
      );

      await act(async () => {
        await result.current[1]();
      });

      expect(result.current[0].data).toEqual(mockData);
      expect(result.current[0].error).toBeNull();
      expect(result.current[0].isFetching).toBe(false);
    });

    it('sets error state when the SDK call fails', async () => {
      mockSdkGetCountries.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useSDKMethod({ method: 'getCountries', onMount: false }),
      );

      await act(async () => {
        await result.current[1]();
      });

      expect(result.current[0].data).toBeNull();
      expect(result.current[0].error).toBe('Network error');
      expect(result.current[0].isFetching).toBe(false);
    });
  });
});
