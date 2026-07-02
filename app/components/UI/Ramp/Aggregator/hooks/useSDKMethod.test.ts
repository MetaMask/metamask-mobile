import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useSDKMethod from './useSDKMethod';
import { RampSDK } from '../sdk';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockGetCountries = jest.fn().mockResolvedValue([]);

const mockUseRampSDKInitialValues: DeepPartial<RampSDK> = {
  sdk: {
    getCountries: mockGetCountries,
  } as unknown as RampSDK['sdk'],
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
  SDK: {
    getSignature: jest.fn().mockReturnValue({ parameters: [] }),
  },
}));

jest.mock('@consensys/on-ramp-sdk', () => ({
  RegionsService: {
    prototype: {
      getCountries: jest.fn(),
      getDefaultFiatCurrency: jest.fn(),
    },
  },
  ServicesSignatures: {
    RegionsService: {
      getCountries: { parameters: [] },
      getDefaultFiatCurrency: { parameters: [{ required: true }] },
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useSDKMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = { ...mockUseRampSDKInitialValues };
    mockGetCountries.mockResolvedValue([]);
  });

  describe('query stability', () => {
    it('returns the same query function reference across re-renders when params do not change', () => {
      const { result, rerender } = renderHookWithProvider(() =>
        useSDKMethod('getCountries'),
      );

      const queryFirstRender = result.current[1];
      rerender(() => useSDKMethod('getCountries'));
      const querySecondRender = result.current[1];

      expect(queryFirstRender).toBe(querySecondRender);
    });

    it('returns the same query function reference across multiple re-renders', () => {
      const { result, rerender } = renderHookWithProvider(() =>
        useSDKMethod('getCountries'),
      );

      const queryFirstRender = result.current[1];

      rerender(() => useSDKMethod('getCountries'));
      rerender(() => useSDKMethod('getCountries'));
      rerender(() => useSDKMethod('getCountries'));

      const queryAfterRerenders = result.current[1];

      expect(queryFirstRender).toBe(queryAfterRerenders);
    });
  });

  describe('JSON.stringify memoization', () => {
    it('does not call JSON.stringify on every render when params do not change', () => {
      const jsonStringifySpy = jest.spyOn(JSON, 'stringify');

      const { rerender } = renderHookWithProvider(() =>
        useSDKMethod('getCountries'),
      );

      const callsAfterMount = jsonStringifySpy.mock.calls.length;

      rerender(() => useSDKMethod('getCountries'));
      rerender(() => useSDKMethod('getCountries'));
      rerender(() => useSDKMethod('getCountries'));
      rerender(() => useSDKMethod('getCountries'));

      // JSON.stringify should not be called again after re-renders with unchanged params
      expect(jsonStringifySpy.mock.calls.length).toBe(callsAfterMount);

      jsonStringifySpy.mockRestore();
    });

    it('calls JSON.stringify when params change', () => {
      const jsonStringifySpy = jest.spyOn(JSON, 'stringify');

      const mockGetDefaultFiatCurrency = jest
        .fn()
        .mockResolvedValue({ id: 'usd' });
      mockUseRampSDKValues = {
        sdk: {
          getDefaultFiatCurrency: mockGetDefaultFiatCurrency,
        } as unknown as RampSDK['sdk'],
      };

      let regionId = 'region-1';
      const { rerender } = renderHookWithProvider(() =>
        useSDKMethod('getDefaultFiatCurrency', regionId as '/regions/cl'),
      );

      const callsAfterMount = jsonStringifySpy.mock.calls.length;

      // Re-render with same params - no new stringify call
      rerender(() =>
        useSDKMethod('getDefaultFiatCurrency', regionId as '/regions/cl'),
      );
      expect(jsonStringifySpy.mock.calls.length).toBe(callsAfterMount);

      // Re-render with different params - stringify should be called again
      regionId = 'region-2';
      rerender(() =>
        useSDKMethod('getDefaultFiatCurrency', regionId as '/regions/cl'),
      );
      expect(jsonStringifySpy.mock.calls.length).toBeGreaterThan(callsAfterMount);

      jsonStringifySpy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('returns initial loading state with null data and null error', () => {
      const { result } = renderHookWithProvider(() =>
        useSDKMethod({ method: 'getCountries', onMount: false }),
      );

      const [state] = result.current;
      expect(state.data).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isFetching).toBe(false);
    });

    it('returns the query function as the second element', () => {
      const { result } = renderHookWithProvider(() =>
        useSDKMethod({ method: 'getCountries', onMount: false }),
      );

      expect(typeof result.current[1]).toBe('function');
    });
  });
});
