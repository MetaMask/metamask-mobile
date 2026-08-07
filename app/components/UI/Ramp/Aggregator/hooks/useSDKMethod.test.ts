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

  describe('param content stability', () => {
    it('keeps the same query reference when param values are unchanged', () => {
      const mockGetDefaultFiatCurrency = jest
        .fn()
        .mockResolvedValue({ id: 'usd' });
      mockUseRampSDKValues = {
        sdk: {
          getDefaultFiatCurrency: mockGetDefaultFiatCurrency,
        } as unknown as RampSDK['sdk'],
      };

      const regionId = 'region-1';
      const { result, rerender } = renderHookWithProvider(() =>
        useSDKMethod('getDefaultFiatCurrency', regionId as '/regions/cl'),
      );

      const queryFirstRender = result.current[1];
      rerender(() =>
        useSDKMethod('getDefaultFiatCurrency', regionId as '/regions/cl'),
      );

      expect(result.current[1]).toBe(queryFirstRender);
    });

    it('returns a new query reference when param values change', () => {
      const mockGetDefaultFiatCurrency = jest
        .fn()
        .mockResolvedValue({ id: 'usd' });
      mockUseRampSDKValues = {
        sdk: {
          getDefaultFiatCurrency: mockGetDefaultFiatCurrency,
        } as unknown as RampSDK['sdk'],
      };

      let regionId = 'region-1';
      const { result, rerender } = renderHookWithProvider(() =>
        useSDKMethod('getDefaultFiatCurrency', regionId as '/regions/cl'),
      );

      const queryFirstRender = result.current[1];

      regionId = 'region-2';
      rerender(() =>
        useSDKMethod('getDefaultFiatCurrency', regionId as '/regions/cl'),
      );

      expect(result.current[1]).not.toBe(queryFirstRender);
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
