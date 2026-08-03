import { renderHook } from '@testing-library/react-native';
import { useEnsureCompatibleProvider } from './useEnsureCompatibleProvider';
import { useRampsProviders } from './useRampsProviders';

jest.mock('./useRampsProviders', () => ({
  useRampsProviders: jest.fn(),
}));

const mockUseRampsProviders = useRampsProviders as jest.Mock;
const mockSetSelectedProviderForAsset = jest.fn();

const ASSET_ID = 'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

const makeProvider = (id: string) => ({ id });

function setup(providers: ReturnType<typeof makeProvider>[]) {
  mockUseRampsProviders.mockReturnValue({
    providers,
    setSelectedProviderForAsset: mockSetSelectedProviderForAsset,
  });
}

describe('useEnsureCompatibleProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls setSelectedProviderForAsset with the asset id when providers are loaded', () => {
    setup([makeProvider('coinbase'), makeProvider('transak-native')]);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProviderForAsset).toHaveBeenCalledWith(ASSET_ID, {
      autoSelected: true,
    });
  });

  it('is a no-op when assetId is undefined', () => {
    setup([makeProvider('transak-native')]);

    renderHook(() => useEnsureCompatibleProvider(undefined));

    expect(mockSetSelectedProviderForAsset).not.toHaveBeenCalled();
  });

  it('is a no-op when the providers list is empty', () => {
    setup([]);

    renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

    expect(mockSetSelectedProviderForAsset).not.toHaveBeenCalled();
  });

  it('re-runs and calls setSelectedProviderForAsset when providers load after initial render', () => {
    setup([]);
    const { rerender } = renderHook(() =>
      useEnsureCompatibleProvider(ASSET_ID),
    );

    expect(mockSetSelectedProviderForAsset).not.toHaveBeenCalled();

    setup([makeProvider('transak-native')]);
    rerender({});

    expect(mockSetSelectedProviderForAsset).toHaveBeenCalledWith(ASSET_ID, {
      autoSelected: true,
    });
  });
});
