import Engine from '../../core/Engine';
import { SEPOLIA } from '../../constants/network';
import { store } from '../../store';
import { handleNetworkSwitch } from './handleNetworkSwitch';
import { SolScope } from '@metamask/keyring-api';

const mockEngine = Engine;
const mockStore = jest.mocked(store);

jest.mock('../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
    NetworkController: {
      setActiveNetwork: jest.fn(),
      setProviderType: jest.fn(),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
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
            MultichainNetworkController: {
              isEvmSelected: true,
              selectedMultichainNetworkChainId: SolScope.Mainnet,

              multichainNetworkConfigurationsByChainId: {},
            },
            NetworkController: {
              selectedNetworkClientId: 'networkId1',
              networkConfigurationsByChainId: {
                '0x1': {
                  blockExplorerUrls: [],
                  chainId: '0x1',
                  defaultRpcEndpointIndex: 0,
                  name: 'Mainnet',
                  nativeCurrency: 'TEST',
                  rpcEndpoints: [
                    {
                      networkClientId: 'networkId1',
                      type: 'infura',
                      url: 'custom-testnet-rpc-url',
                    },
                  ],
                },
                '0x53a': {
                  blockExplorerUrls: [],
                  chainId: '0x53a',
                  defaultRpcEndpointIndex: 0,
                  name: 'Testnet',
                  nativeCurrency: 'TEST',
                  rpcEndpoints: [
                    {
                      networkClientId: 'networkId1',
                      type: 'custom',
                      url: 'custom-testnet-rpc-url-2',
                    },
                  ],
                },
                '0xaa36a7': {
                  blockExplorerUrls: [],
                  chainId: '0xaa36a7',
                  defaultRpcEndpointIndex: 0,
                  name: 'sepolia',
                  nativeCurrency: 'ETH',
                  rpcEndpoints: [
                    {
                      networkClientId: 'networkId1',
                      type: 'custom',
                      url: 'custom-testnet-rpc-url-2',
                    },
                  ],
                },
              },
              networksMetadata: {
                networkId1: {
                  EIPS: { 1559: false },
                },
              },
            },
          },
        },
        // Cast to 'any' because we don't have a complete Redux mock to use
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      mockEngine.context.CurrencyRateController.updateExchangeRate,
    ).not.toBeCalled();

    expect(
      mockEngine.context.MultichainNetworkController.setActiveNetwork,
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
      mockEngine.context.CurrencyRateController.updateExchangeRate,
    ).not.toBeCalled();

    expect(
      mockEngine.context.MultichainNetworkController.setActiveNetwork,
    ).not.toBeCalled();
    expect(
      mockEngine.context.NetworkController.setProviderType,
    ).not.toBeCalled();
    expect(result).toBeUndefined();
  });

  it('switches to a custom network', () => {
    setupGetStateMock();

    const nickname = handleNetworkSwitch('1338');

    expect(
      mockEngine.context.MultichainNetworkController.setActiveNetwork,
    ).toBeCalledWith('networkId1');
    expect(
      mockEngine.context.NetworkController.setProviderType,
    ).not.toBeCalled();
    expect(nickname).toBe('Testnet');
  });

  it('switches to a built-in network', () => {
    setupGetStateMock();

    const networkType = handleNetworkSwitch('11155111');

    expect(
      mockEngine.context.NetworkController.setProviderType,
    ).not.toBeCalledWith();
    expect(
      mockEngine.context.MultichainNetworkController.setActiveNetwork,
    ).toBeCalled();
    expect(networkType).toBe(SEPOLIA);
  });
});
