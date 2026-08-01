import { renderHook } from '@testing-library/react-native';
import { useEnsureCompatibleProvider } from './useEnsureCompatibleProvider';
import { useRampsProviders } from './useRampsProviders';

jest.mock('./useRampsProviders', () => ({
  useRampsProviders: jest.fn(),
}));

const mockUseRampsProviders = useRampsProviders as jest.Mock;
const mockSetSelectedProvider = jest.fn();

// mUSD-on-Monad CAIP-19 asset id (checksummed), matching
// MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD].
const ASSET_ID = 'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

const makeProvider = (id: string, assetIds: string[] = []) => ({
  id,
  supportedCryptoCurrencies: Object.fromEntries(
    assetIds.map((a) => [a.toLowerCase(), true]),
  ),
});

function setup(
  selectedProvider: ReturnType<typeof makeProvider> | null,
  providers: ReturnType<typeof makeProvider>[],
) {
  mockUseRampsProviders.mockReturnValue({
    providers,
    selectedProvider,
    setSelectedProvider: mockSetSelectedProvider,
  });
}

describe('useEnsureCompatibleProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not switch when the selected provider supports the asset', () => {
    const provider = makeProvider('transak-native', [ASSET_ID]);
    setup(provider, [provider]);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProvider).not.toHaveBeenCalled();
  });

  it('switches to the first compatible provider when the selected one does not support the asset', () => {
    const incompatible = makeProvider('coinbase-m');
    const compatible = makeProvider('transak-native', [ASSET_ID]);
    setup(incompatible, [incompatible, compatible]);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(compatible, {
      autoSelected: true,
    });
  });

  it('does not switch when no provider supports the asset', () => {
    const a = makeProvider('coinbase-m');
    const b = makeProvider('moonpay');
    setup(a, [a, b]);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProvider).not.toHaveBeenCalled();
  });

  it('does not switch the provider to itself', () => {
    const provider = makeProvider('transak-native');
    setup(provider, [provider]);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProvider).not.toHaveBeenCalled();
  });

  it('is a no-op when assetId is undefined', () => {
    const provider = makeProvider('coinbase-m');
    setup(provider, [provider]);

    renderHook(() => useEnsureCompatibleProvider(undefined));

    expect(mockSetSelectedProvider).not.toHaveBeenCalled();
  });

  it('is a no-op when selectedProvider is null', () => {
    const compatible = makeProvider('transak-native', [ASSET_ID]);
    setup(null, [compatible]);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProvider).not.toHaveBeenCalled();
  });

  it('is a no-op when the providers list is empty', () => {
    const provider = makeProvider('coinbase-m');
    setup(provider, []);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProvider).not.toHaveBeenCalled();
  });

  it('matches the asset case-insensitively (API key lowercase, caller assetId checksummed)', () => {
    const incompatible = makeProvider('coinbase-m');
    // The providers API returns lowercase keys; the caller may pass a
    // checksummed assetId. providerSupportsAsset handles this via its
    // assetId.toLowerCase() fallback lookup.
    const compatible = {
      id: 'transak-native',
      supportedCryptoCurrencies: { [ASSET_ID.toLowerCase()]: true },
    };
    setup(incompatible, [incompatible, compatible]);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(compatible, {
      autoSelected: true,
    });
  });
});
