import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RampSDK } from '../sdk';
import useCryptoCurrencies from './useCryptoCurrencies';
import useSDKMethod from './useSDKMethod';
import { NetworkStatus } from '@metamask/network-controller';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockuseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedRegion: { id: 'test-region-id' },
  selectedFiatCurrencyId: 'test-fiat-currency-id',
  selectedAsset: null,
  setSelectedAsset: jest.fn(),
  setIntent: jest.fn(),
  isBuy: true,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockuseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

jest.mock('./useSDKMethod');

const mockNetworkState = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1' as `0x${string}`,
            name: 'Ethereum Mainnet',
            rpcEndpoints: [
              {
                url: 'https://mainnet.infura.io/v3',
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'ETH',
          },
          '0x89': {
            chainId: '0x89' as `0x${string}`,
            name: 'Polygon',
            rpcEndpoints: [
              {
                url: 'https://polygon-rpc.com',
                networkClientId: 'polygon',
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'MATIC',
          },
        },
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: {
            status: NetworkStatus.Available,
          },
          polygon: {
            status: NetworkStatus.Available,
          },
        },
      },
      MultichainNetworkController: {
        multichainNetworkConfigurationsByChainId: {},
      },
    },
  },
};

describe('useCryptoCurrencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
    };
  });

  it('calls useSDKMethod with the correct parameters for buy', () => {
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);

    renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getCryptoCurrencies',
      'test-region-id',
      [],
      'test-fiat-currency-id',
    );
  });

  it('calls useSDKMethod with the correct parameters for sell', () => {
    mockUseRampSDKValues.isBuy = false;
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);

    renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getSellCryptoCurrencies',
      'test-region-id',
      [],
      'test-fiat-currency-id',
    );
  });

  it('returns loading state', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: true,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(result.current).toEqual({
      cryptoCurrencies: null,
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: true,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('returns error state', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: null,
        error: 'test error message',
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(result.current).toEqual({
      cryptoCurrencies: null,
      errorCryptoCurrencies: 'test error message',
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('filters list by available network configurations', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { network: { chainId: '1' }, address: 'test-address-1' },
          { network: { chainId: '137' }, address: 'test-address-2' },
          { network: { chainId: '999' }, address: 'test-address-3' }, // Not in network configs
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(result.current).toEqual({
      cryptoCurrencies: [
        { network: { chainId: '1' }, address: 'test-address-1' },
        { network: { chainId: '137' }, address: 'test-address-2' },
      ],
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('does not call setSelectedAsset if current selection is available', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { network: { chainId: '1' }, address: 'test-address-1' },
          { network: { chainId: '1' }, address: 'test-address-2' },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    mockUseRampSDKValues.selectedAsset = {
      network: { chainId: '1' },
      address: 'test-address-2',
    };

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(mockUseRampSDKValues.setSelectedAsset).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      cryptoCurrencies: [
        { network: { chainId: '1' }, address: 'test-address-1' },
        { network: { chainId: '1' }, address: 'test-address-2' },
      ],
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('selects the native crypto currency if available and current selection is null', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { network: { chainId: '1' }, address: 'test-address-1' },
          { network: { chainId: '1' }, address: 'test-address-2' },
          { network: { chainId: '1' }, address: NATIVE_ADDRESS },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(mockUseRampSDKValues.setSelectedAsset).toHaveBeenCalledWith({
      network: { chainId: '1' },
      address: NATIVE_ADDRESS,
    });
    expect(result.current).toEqual({
      cryptoCurrencies: [
        { network: { chainId: '1' }, address: 'test-address-1' },
        { network: { chainId: '1' }, address: 'test-address-2' },
        { network: { chainId: '1' }, address: NATIVE_ADDRESS },
      ],
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('selects the native crypto currency if available and current selection is not available', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { network: { chainId: '1' }, address: 'test-address-1' },
          { network: { chainId: '1' }, address: 'test-address-2' },
          { network: { chainId: '1' }, address: NATIVE_ADDRESS },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    mockUseRampSDKValues.selectedAsset = {
      network: { chainId: '1' },
      address: 'test-address-3',
    };

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(mockUseRampSDKValues.setSelectedAsset).toHaveBeenCalledWith({
      network: { chainId: '1' },
      address: NATIVE_ADDRESS,
    });
    expect(result.current).toEqual({
      cryptoCurrencies: [
        { network: { chainId: '1' }, address: 'test-address-1' },
        { network: { chainId: '1' }, address: 'test-address-2' },
        { network: { chainId: '1' }, address: NATIVE_ADDRESS },
      ],
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('selects the first available crypto currency if native is not available and current selection is null', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { network: { chainId: '1' }, address: 'test-address-1' },
          { network: { chainId: '1' }, address: 'test-address-2' },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(mockUseRampSDKValues.setSelectedAsset).toHaveBeenCalledWith({
      network: { chainId: '1' },
      address: 'test-address-1',
    });
    expect(result.current).toEqual({
      cryptoCurrencies: [
        { network: { chainId: '1' }, address: 'test-address-1' },
        { network: { chainId: '1' }, address: 'test-address-2' },
      ],
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('selects the first available crypto currency if native is not available and current selection is not found', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { network: { chainId: '1' }, address: 'test-address-1' },
          { network: { chainId: '1' }, address: 'test-address-2' },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    mockUseRampSDKValues.selectedAsset = {
      network: { chainId: '1' },
      address: 'test-address-3',
    };

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(mockUseRampSDKValues.setSelectedAsset).toHaveBeenCalledWith({
      network: { chainId: '1' },
      address: 'test-address-1',
    });
    expect(result.current).toEqual({
      cryptoCurrencies: [
        { network: { chainId: '1' }, address: 'test-address-1' },
        { network: { chainId: '1' }, address: 'test-address-2' },
      ],
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('sets selectedAsset to undefined if no crypto currencies are available', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(mockUseRampSDKValues.setSelectedAsset).toHaveBeenCalledWith(
      undefined,
    );
    expect(result.current).toEqual({
      cryptoCurrencies: [],
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });
  });

  it('selects the crypto currency from intent if available and resets it', () => {
    const mockQueryGetCryptoCurrencies = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { network: { chainId: '1' }, address: 'test-address-1' },
          { network: { chainId: '1' }, address: 'test-address-2' },
          { network: { chainId: '1' }, address: NATIVE_ADDRESS },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCryptoCurrencies,
    ]);

    mockUseRampSDKValues.selectedAsset = {
      network: { chainId: '1' },
      address: 'test-address-3',
    };

    const mockedIntent = { address: 'test-address-2' };
    mockUseRampSDKValues.intent = mockedIntent;

    const { result } = renderHookWithProvider(() => useCryptoCurrencies(), {
      state: mockNetworkState,
    });

    expect(mockUseRampSDKValues.setSelectedAsset).toHaveBeenCalledWith({
      network: { chainId: '1' },
      address: 'test-address-2',
    });
    expect(result.current).toEqual({
      cryptoCurrencies: [
        { network: { chainId: '1' }, address: 'test-address-1' },
        { network: { chainId: '1' }, address: 'test-address-2' },
        { network: { chainId: '1' }, address: NATIVE_ADDRESS },
      ],
      errorCryptoCurrencies: null,
      isFetchingCryptoCurrencies: false,
      queryGetCryptoCurrencies: mockQueryGetCryptoCurrencies,
    });

    expect(mockUseRampSDKValues.setIntent).toHaveBeenCalledWith(
      expect.any(Function),
    );
    const setIntentFunction = (mockUseRampSDKValues.setIntent as jest.Mock).mock
      .calls[0][0];
    expect(setIntentFunction(mockedIntent)).toEqual({
      address: undefined,
    });
  });
});
