import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import type { Provider } from '@metamask/ramps-controller';
import { useEnsureProviderForAsset } from './useEnsureProviderForAsset';
import { useRampsController } from './useRampsController';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('./useRampsController', () => ({
  useRampsController: jest.fn(),
}));

const ASSET_ETH_MAINNET = 'eip155:1/slip44:60';
const ASSET_USDC_ARBITRUM =
  'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

function buildProvider(
  id: string,
  supports: Record<string, boolean>,
): Provider {
  return {
    id,
    name: id,
    supportedCryptoCurrencies: supports,
  } as unknown as Provider;
}

describe('useEnsureProviderForAsset', () => {
  const mockNavigate = jest.fn();
  const mockSetSelectedProvider = jest.fn();
  const mockUseNavigation = jest.mocked(useNavigation);
  const mockUseRampsController = jest.mocked(useRampsController);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setController(overrides: {
    providers?: Provider[];
    selectedProvider?: Provider | null;
  }) {
    mockUseRampsController.mockReturnValue({
      providers: overrides.providers ?? [],
      selectedProvider: overrides.selectedProvider ?? null,
      setSelectedProvider: mockSetSelectedProvider,
    } as unknown as ReturnType<typeof useRampsController>);
  }

  it('selects the first supporting provider when none is selected', () => {
    const transak = buildProvider('transak-native', {
      [ASSET_ETH_MAINNET]: true,
    });
    const other = buildProvider('other', { [ASSET_ETH_MAINNET]: false });
    setController({ providers: [other, transak], selectedProvider: null });

    renderHook(() =>
      useEnsureProviderForAsset({
        enabled: true,
        assetId: ASSET_ETH_MAINNET,
        isTokenUnavailable: false,
      }),
    );

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(transak, {
      autoSelected: true,
    });
  });

  it('switches to a supporting provider when current cannot fulfill the asset', () => {
    const wrong = buildProvider('wrong', { [ASSET_ETH_MAINNET]: false });
    const right = buildProvider('right', { [ASSET_USDC_ARBITRUM]: true });
    setController({
      providers: [wrong, right],
      selectedProvider: wrong,
    });

    renderHook(() =>
      useEnsureProviderForAsset({
        enabled: true,
        assetId: ASSET_USDC_ARBITRUM,
        isTokenUnavailable: true,
      }),
    );

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(right, {
      autoSelected: true,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('invokes onNoSupportingProvider when no provider supports the asset', () => {
    const wrong = buildProvider('wrong', { [ASSET_ETH_MAINNET]: false });
    const onNoSupportingProvider = jest.fn();
    setController({ providers: [wrong], selectedProvider: wrong });

    renderHook(() =>
      useEnsureProviderForAsset({
        enabled: true,
        assetId: ASSET_USDC_ARBITRUM,
        isTokenUnavailable: true,
        onNoSupportingProvider,
      }),
    );

    expect(onNoSupportingProvider).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(onNoSupportingProvider).toHaveBeenCalledWith(ASSET_USDC_ARBITRUM);
    expect(mockSetSelectedProvider).not.toHaveBeenCalled();
  });

  it('falls back to TokenNotAvailable modal navigation when no callback is provided', () => {
    const wrong = buildProvider('wrong', { [ASSET_ETH_MAINNET]: false });
    setController({ providers: [wrong], selectedProvider: wrong });

    renderHook(() =>
      useEnsureProviderForAsset({
        enabled: true,
        assetId: ASSET_USDC_ARBITRUM,
        isTokenUnavailable: true,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    // First arg is the parent route, second is the nested screen config.
    const [route, config] = mockNavigate.mock.calls[0];
    expect(route).toBe('RampModals');
    expect(config).toMatchObject({
      screen: 'RampTokenNotAvailableModal',
      params: { assetId: ASSET_USDC_ARBITRUM },
    });
  });

  it('is inert and resets dedup state when enabled is false', () => {
    const onNoSupportingProvider = jest.fn();
    const wrong = buildProvider('wrong', { [ASSET_ETH_MAINNET]: false });
    setController({ providers: [wrong], selectedProvider: wrong });

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useEnsureProviderForAsset({
          enabled,
          assetId: ASSET_USDC_ARBITRUM,
          isTokenUnavailable: true,
          onNoSupportingProvider,
        }),
      { initialProps: { enabled: false } },
    );

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(onNoSupportingProvider).not.toHaveBeenCalled();
    expect(mockSetSelectedProvider).not.toHaveBeenCalled();

    rerender({ enabled: true });
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(onNoSupportingProvider).toHaveBeenCalledWith(ASSET_USDC_ARBITRUM);
  });

  it('does not re-fire onNoSupportingProvider for the same provider/asset pair', () => {
    const onNoSupportingProvider = jest.fn();
    const wrong = buildProvider('wrong', { [ASSET_ETH_MAINNET]: false });
    setController({ providers: [wrong], selectedProvider: wrong });

    const { rerender } = renderHook(
      ({ refreshKey }: { refreshKey: number }) =>
        useEnsureProviderForAsset({
          enabled: true,
          assetId: ASSET_USDC_ARBITRUM,
          isTokenUnavailable: true,
          onNoSupportingProvider,
          refreshKey,
        }),
      { initialProps: { refreshKey: 0 } },
    );

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(onNoSupportingProvider).toHaveBeenCalledTimes(1);

    // Rerendering with a higher refreshKey but the same provider/asset
    // should NOT fire again — the dedup key matches.
    rerender({ refreshKey: 1 });
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(onNoSupportingProvider).toHaveBeenCalledTimes(1);
  });
});
