import { renderHook } from '@testing-library/react-native';
import { useEnsureCompatibleProvider } from './useEnsureCompatibleProvider';
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
const mockSetSelectedProviderForAsset = jest.fn();
const mockSetSelectedProvider = jest.fn();

const ASSET_ID = 'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

const makeProvider = (id: string) => ({ id });

const makeTypedProvider = (
  id: string,
  type: 'native' | 'aggregator',
  servesAsset = true,
) => ({
  id,
  type,
  supportedCryptoCurrencies: servesAsset ? { [ASSET_ID]: true } : {},
});

function setup(
  providers: { id: string }[],
  options?: {
    selectedProvider?: { id: string; type?: string } | null;
    allProvidersEnabled?: boolean;
    didSwitch?: boolean;
  },
) {
  mockSetSelectedProviderForAsset.mockReturnValue(options?.didSwitch ?? false);
  mockUseHeadlessAllProvidersEnabled.mockReturnValue(
    options?.allProvidersEnabled ?? false,
  );
  mockUseRampsProviders.mockReturnValue({
    providers,
    selectedProvider: options?.selectedProvider ?? null,
    setSelectedProvider: mockSetSelectedProvider,
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

  describe('when moneyHeadlessAllProviders is disabled', () => {
    it('switches to a native provider serving the asset when an aggregator is selected', () => {
      const aggregator = makeTypedProvider('coinbase', 'aggregator');
      const native = makeTypedProvider('transak-native', 'native');
      setup([aggregator, native], { selectedProvider: aggregator });

      renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

      expect(mockSetSelectedProvider).toHaveBeenCalledWith(native, {
        autoSelected: true,
      });
    });

    it('leaves the selection alone when the selected provider is already native', () => {
      const native = makeTypedProvider('transak-native', 'native');
      setup([native], { selectedProvider: native });

      renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('leaves the selection alone when no native provider serves the asset', () => {
      const aggregator = makeTypedProvider('coinbase', 'aggregator');
      const otherNative = makeTypedProvider('transak-native', 'native', false);
      setup([aggregator, otherNative], { selectedProvider: aggregator });

      renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('leaves the selection alone when the controller already switched providers', () => {
      const aggregator = makeTypedProvider('coinbase', 'aggregator');
      const native = makeTypedProvider('transak-native', 'native');
      setup([aggregator, native], {
        selectedProvider: aggregator,
        didSwitch: true,
      });

      renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });
  });

  describe('when moneyHeadlessAllProviders is enabled', () => {
    it('keeps the aggregator selection the controller left in place', () => {
      const aggregator = makeTypedProvider('coinbase', 'aggregator');
      const native = makeTypedProvider('transak-native', 'native');
      setup([aggregator, native], {
        selectedProvider: aggregator,
        allProvidersEnabled: true,
      });

      renderHook(() => useEnsureCompatibleProvider(ASSET_ID));

      expect(mockSetSelectedProviderForAsset).toHaveBeenCalledWith(ASSET_ID, {
        autoSelected: true,
      });
      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });
  });
});
