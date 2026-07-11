import { renderHook } from '@testing-library/react-native';
import { useRegionHasFiatProvider } from './useRegionHasFiatProvider';
import { useRampsProviders } from './useRampsProviders';
import { useHeadlessAllProvidersEnabled } from './useHeadlessAllProvidersEnabled';

jest.mock('./useRampsProviders', () => ({
  useRampsProviders: jest.fn(),
}));
jest.mock('./useHeadlessAllProvidersEnabled', () => ({
  useHeadlessAllProvidersEnabled: jest.fn(),
}));

const mockUseRampsProviders = useRampsProviders as jest.Mock;
const mockUseHeadlessAllProvidersEnabled =
  useHeadlessAllProvidersEnabled as jest.Mock;

// mUSD-on-Monad CAIP-19 asset id (checksummed), matching
// MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD].
const ASSET_ID = 'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA';
const OTHER_ASSET_ID =
  'eip155:1/erc20:0x0000000000000000000000000000000000000000';

// Serves the deposit asset via a lowercased key.
const servingCryptoCurrencies = { [ASSET_ID.toLowerCase()]: true };
// Serves a different asset only.
const nonServingCryptoCurrencies = { [OTHER_ASSET_ID.toLowerCase()]: true };

describe('useRegionHasFiatProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHeadlessAllProvidersEnabled.mockReturnValue(false);
  });

  it.each([false, true])(
    'returns true when a native provider serves the asset (flag %s)',
    (allProvidersEnabled) => {
      mockUseHeadlessAllProvidersEnabled.mockReturnValue(allProvidersEnabled);
      mockUseRampsProviders.mockReturnValue({
        providers: [
          { type: 'aggregator', supportedCryptoCurrencies: {} },
          {
            type: 'native',
            supportedCryptoCurrencies: servingCryptoCurrencies,
          },
        ],
      });

      const { result } = renderHook(() => useRegionHasFiatProvider(ASSET_ID));

      expect(result.current).toBe(true);
    },
  );

  describe('when the flag is disabled (native-only)', () => {
    beforeEach(() => {
      mockUseHeadlessAllProvidersEnabled.mockReturnValue(false);
    });

    it('returns false when a native provider is present but does not serve the asset', () => {
      mockUseRampsProviders.mockReturnValue({
        providers: [
          {
            type: 'native',
            supportedCryptoCurrencies: nonServingCryptoCurrencies,
          },
        ],
      });

      const { result } = renderHook(() => useRegionHasFiatProvider(ASSET_ID));

      expect(result.current).toBe(false);
    });

    it('returns false when only aggregator providers serve the asset', () => {
      mockUseRampsProviders.mockReturnValue({
        providers: [
          {
            type: 'aggregator',
            supportedCryptoCurrencies: servingCryptoCurrencies,
          },
          {
            type: 'aggregator',
            supportedCryptoCurrencies: servingCryptoCurrencies,
          },
        ],
      });

      const { result } = renderHook(() => useRegionHasFiatProvider(ASSET_ID));

      expect(result.current).toBe(false);
    });

    it('returns false when the region has no providers', () => {
      mockUseRampsProviders.mockReturnValue({ providers: [] });

      const { result } = renderHook(() => useRegionHasFiatProvider(ASSET_ID));

      expect(result.current).toBe(false);
    });
  });

  describe('when the flag is enabled (all providers)', () => {
    beforeEach(() => {
      mockUseHeadlessAllProvidersEnabled.mockReturnValue(true);
    });

    it('returns true when an aggregator serves the asset', () => {
      mockUseRampsProviders.mockReturnValue({
        providers: [
          {
            type: 'aggregator',
            supportedCryptoCurrencies: servingCryptoCurrencies,
          },
          {
            type: 'aggregator',
            supportedCryptoCurrencies: nonServingCryptoCurrencies,
          },
        ],
      });

      const { result } = renderHook(() => useRegionHasFiatProvider(ASSET_ID));

      expect(result.current).toBe(true);
    });

    it('returns false when providers are present but none serve the asset (New York case)', () => {
      mockUseRampsProviders.mockReturnValue({
        providers: [
          {
            type: 'aggregator',
            supportedCryptoCurrencies: nonServingCryptoCurrencies,
          },
          {
            type: 'aggregator',
            supportedCryptoCurrencies: nonServingCryptoCurrencies,
          },
        ],
      });

      const { result } = renderHook(() => useRegionHasFiatProvider(ASSET_ID));

      expect(result.current).toBe(false);
    });

    it('returns false when the region has no providers at all', () => {
      mockUseRampsProviders.mockReturnValue({ providers: [] });

      const { result } = renderHook(() => useRegionHasFiatProvider(ASSET_ID));

      expect(result.current).toBe(false);
    });
  });

  it('matches the asset case-insensitively (provider key checksummed vs lowercased assetId)', () => {
    mockUseHeadlessAllProvidersEnabled.mockReturnValue(true);
    mockUseRampsProviders.mockReturnValue({
      providers: [
        {
          type: 'aggregator',
          // Provider key is checksummed; the caller passes a lowercased id.
          supportedCryptoCurrencies: { [ASSET_ID]: true },
        },
      ],
    });

    const { result } = renderHook(() =>
      useRegionHasFiatProvider(ASSET_ID.toLowerCase()),
    );

    expect(result.current).toBe(true);
  });

  it('excludes providers with no supportedCryptoCurrencies map', () => {
    mockUseHeadlessAllProvidersEnabled.mockReturnValue(true);
    mockUseRampsProviders.mockReturnValue({
      providers: [{ type: 'aggregator' }, { type: 'native' }],
    });

    const { result } = renderHook(() => useRegionHasFiatProvider(ASSET_ID));

    expect(result.current).toBe(false);
  });

  it('returns false when the assetId is empty (fails closed)', () => {
    mockUseHeadlessAllProvidersEnabled.mockReturnValue(true);
    mockUseRampsProviders.mockReturnValue({
      providers: [
        {
          type: 'native',
          supportedCryptoCurrencies: servingCryptoCurrencies,
        },
      ],
    });

    const { result } = renderHook(() => useRegionHasFiatProvider(''));

    expect(result.current).toBe(false);
  });
});
