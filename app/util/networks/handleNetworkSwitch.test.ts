import Engine from '../../core/Engine';
import { NETWORKS_CHAIN_ID, SEPOLIA } from '../../constants/network';
import { store } from '../../store';
import handleNetworkSwitch from './handleNetworkSwitch';

const mockEngine = Engine;
const mockStore = jest.mocked(store);

jest.mock('../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      setNativeCurrency: jest.fn(),
    },
    NetworkController: {
      setActiveNetwork: jest.fn(),
      setProviderType: jest.fn(),
    },
  },
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

function setupGetStateMock() {
  mockStore.getState.mockImplementation(
    () =>
      ({
        engine: {
          backgroundState: {
            NetworkController: {
              network: 'loading',
              isCustomNetwork: false,
              networkConfigurations: {
                networkId1: {
                  rpcUrl: 'custom-testnet-rpc-url',
                  chainId: '1338',
                  ticker: 'TEST',
                  nickname: 'Testnet',
                },
              },
              providerConfig: {
                type: 'mainnet',
                chainId: '1',
              },
              networkDetails: {
                isEIP1559Compatible: false,
              },
            },
          },
        },
        // Cast to 'any' because we don't have a complete Redux mock to use
      } as any),
  );
}

describe('useHandleNetworkSwitch', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('does nothing if not given a chain ID', () => {
    setupGetStateMock();

    const result = handleNetworkSwitch('');

    expect(
      mockEngine.context.CurrencyRateController.setNativeCurrency,
    ).not.toBeCalled();
    expect(
      mockEngine.context.NetworkController.setActiveNetwork,
    ).not.toBeCalled();
    expect(
      mockEngine.context.NetworkController.setProviderType,
    ).not.toBeCalled();
    expect(result).toBeUndefined();
  });

  it('does nothing if the chain ID matches the current global chain ID', () => {
    setupGetStateMock();

    const result = handleNetworkSwitch('1');

    expect(
      mockEngine.context.CurrencyRateController.setNativeCurrency,
    ).not.toBeCalled();
    expect(
      mockEngine.context.NetworkController.setActiveNetwork,
    ).not.toBeCalled();
    expect(
      mockEngine.context.NetworkController.setProviderType,
    ).not.toBeCalled();
    expect(result).toBeUndefined();
  });

  it('throws an error if the chain ID is not recognized', () => {
    setupGetStateMock();

    expect(() => handleNetworkSwitch('123456')).toThrow(
      'Unknown network with id 123456',
    );
  });

  it('switches to a custom network', () => {
    setupGetStateMock();

    const nickname = handleNetworkSwitch('1338');

    expect(
      mockEngine.context.CurrencyRateController.setNativeCurrency,
    ).toBeCalledWith('TEST');
    expect(
      mockEngine.context.NetworkController.setActiveNetwork,
    ).toBeCalledWith('networkId1');
    expect(
      mockEngine.context.NetworkController.setProviderType,
    ).not.toBeCalled();
    expect(nickname).toBe('Testnet');
  });

  it('switches to a built-in network', () => {
    setupGetStateMock();

    const networkType = handleNetworkSwitch(NETWORKS_CHAIN_ID.SEPOLIA);

    // TODO: This is a bug, it should be set to SepoliaETH
    expect(
      mockEngine.context.CurrencyRateController.setNativeCurrency,
    ).toBeCalledWith('ETH');
    expect(mockEngine.context.NetworkController.setProviderType).toBeCalledWith(
      SEPOLIA,
    );
    expect(
      mockEngine.context.NetworkController.setActiveNetwork,
    ).not.toBeCalled();
    expect(networkType).toBe(SEPOLIA);
  });
});
