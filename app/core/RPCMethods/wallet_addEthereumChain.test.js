import { InteractionManager } from 'react-native';
import { wallet_addEthereumChain } from './wallet_addEthereumChain';
import Engine from '../Engine';
import { mockNetworkState } from '../../util/test/network';
import MetaMetrics from '../Analytics/MetaMetrics';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import { MetricsEventBuilder } from '../Analytics/MetricsEventBuilder';
import { flushPromises } from '../../util/test/utils';

jest.mock('../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  addItemToChainIdList: jest.fn().mockReturnValue({
    chain_id_list: ['eip155:1', 'eip155:100'],
  }),
}));

const mockEngine = Engine;

const existingNetworkConfiguration = {
  id: 'test-network-configuration-id',
  chainId: '0x2',
  name: 'Test Chain',
  rpcUrl: 'https://rpc.test-chain.com',
  ticker: 'TST',
  nickname: 'Test Chain',
  rpcPrefs: {
    blockExplorerUrl: 'https://explorer.test-chain.com',
  },
};

jest.mock('../Engine', () => ({
  init: () => mockEngine.init({}),
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
      upsertNetworkConfiguration: jest.fn(),
      addNetwork: jest.fn(),
      updateNetwork: jest.fn(),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    ApprovalController: {
      clear: jest.fn(),
    },
    PermissionController: {
      hasPermission: jest.fn().mockReturnValue(true),
      grantPermissionsIncremental: jest.fn(),
      requestPermissionsIncremental: jest.fn(),
      getCaveat: jest.fn(),
    },
    KeyringController: {
      isUnlocked: jest.fn(),
    },
    SelectedNetworkController: {
      setNetworkClientIdForDomain: jest.fn(),
    },
  },
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      engine: {
        backgroundState: {
          NetworkController: {
            ...mockNetworkState(
              {
                chainId: '0x1',
                id: 'Mainnet',
                nickname: 'Mainnet',
                ticker: 'ETH',
              },
              {
                ...existingNetworkConfiguration,
              },
            ),
          },
        },
      },
    })),
  },
}));

jest.mock('../Analytics/MetaMetrics');
jest.mock('../Analytics/MetricsEventBuilder');

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ name: 'test-event' });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});
const mockAddTraitsToUser = jest.fn();

MetaMetrics.getInstance = jest.fn().mockReturnValue({
  trackEvent: mockTrackEvent,
  addTraitsToUser: mockAddTraitsToUser,
  updateDataRecordingFlag: jest.fn(),
});

MetricsEventBuilder.createEventBuilder = mockCreateEventBuilder;

const correctParams = {
  chainId: '0x64',
  chainName: 'xDai',
  blockExplorerUrls: ['https://blockscout.com/xdai/mainnet'],
  nativeCurrency: { symbol: 'xDai', decimals: 18 },
  rpcUrls: ['https://rpc.gnosischain.com'],
};

const networkConfigurationResult = {
  id: '1',
  chainId: '0x64',
  rpcEndpoints: [{ url: correctParams.rpcUrls[0], networkClientId: '1' }],
  defaultRpcEndpointIndex: 0,
};

describe('RPC Method - wallet_addEthereumChain', () => {
  let mockFetch;
  let otherOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    otherOptions = {
      res: {},
      addCustomNetworkRequest: {},
      switchCustomNetworkRequest: {},
      requestUserApproval: jest.fn(() => Promise.resolve()),
      hooks: {
        getCurrentChainIdForDomain: jest.fn(),
        getNetworkConfigurationByChainId: jest.fn(),
        getCaveat: jest.fn(),
        requestPermittedChainsPermissionIncrementalForOrigin: jest.fn(),
        hasApprovalRequestsForOrigin: jest.fn(),
      },
    };

    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((callback) => callback());

    mockFetch = jest.fn().mockImplementation(async (url) => {
      if (url === 'https://rpc.gnosischain.com') {
        return { json: () => Promise.resolve({ result: '0x64' }) };
      } else if (url === 'https://different-rpc-url.com') {
        return { json: () => Promise.resolve({ result: '0x2' }) };
      } else if (url === 'https://chainid.network/chains.json') {
        return {
          json: () =>
            Promise.resolve([
              { chainId: 100, rpc: ['https://rpc.gnosischain.com'] },
            ]),
        };
      }

      return { json: () => Promise.resolve({}) };
    });

    global.fetch = mockFetch;
  });

  afterEach(() => {
    InteractionManager.runAfterInteractions.mockClear();
    global.fetch.mockClear();
  });

  it('reports missing params', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: null,
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain('Expected single, object parameter.');
    }
  });

  it('reports extra keys', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, extraKey: 10 }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        'Received unexpected keys on object parameter. Unsupported keys',
      );
    }
  });

  it('reports invalid rpc url', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, rpcUrls: ['invalid'] }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected an array with at least one valid string HTTPS url 'rpcUrls'`,
      );
    }
  });

  it('reports invalid block explorer url', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, blockExplorerUrls: ['invalid'] }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'.`,
      );
    }
  });

  it('reports invalid chainId', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '10' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'.`,
      );
    }
  });

  it('reports unsafe chainId', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '0xFFFFFFFFFFFED' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        'numerical value greater than max safe value.',
      );
    }
  });

  it('reports chainId not matching rpcUrl returned chainId', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '0x63' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain('does not match');
    }
  });

  it('reports invalid chain name', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainName: undefined }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(`Expected non-empty string 'chainName'.`);
    }
  });

  it('reports invalid native currency', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, nativeCurrency: 'invalid' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected null or object 'nativeCurrency'.`,
      );
    }
  });

  it('reports invalid native currency decimals', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [
            {
              ...correctParams,
              nativeCurrency: { symbol: 'xDai', decimals: 10 },
            },
          ],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided.`,
      );
    }
  });

  it('reports missing native currency symbol', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [
            {
              ...correctParams,
              nativeCurrency: { symbol: null, decimals: 18 },
            },
          ],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected a string 'nativeCurrency.symbol'.`,
      );
    }
  });

  it('reports native currency symbol length exceeds maximum', async () => {
    const symbol = 'aaaaaaaaaaaaaaa';
    await expect(
      wallet_addEthereumChain({
        req: {
          params: [
            {
              ...correctParams,
              nativeCurrency: { symbol, decimals: 18 },
            },
          ],
        },
        ...otherOptions,
      }),
    ).rejects.toThrow(
      `Expected 1-6 character string 'nativeCurrency.symbol'. Received:\n${symbol}`,
    );
  });

  it('allows 1 letter native currency symbols', async () => {
    jest.mock('./networkChecker.util');
    jest
      .spyOn(Engine.context.NetworkController, 'addNetwork')
      .mockReturnValue(networkConfigurationResult);

    await wallet_addEthereumChain({
      req: {
        params: [
          {
            ...correctParams,
            nativeCurrency: { symbol: 'a', decimals: 18 },
          },
        ],
      },
      ...otherOptions,
    });
  });

  describe('Approval Flow', () => {
    it('clears existing approval requests', async () => {
      Engine.context.ApprovalController.clear.mockClear();

      await wallet_addEthereumChain({
        req: {
          params: [correctParams],
        },
        ...otherOptions,
      });

      expect(Engine.context.ApprovalController.clear).toBeCalledTimes(1);
    });
  });

  describe('permissions', () => {
    it('grants permissions when chain is not already permitted', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'addNetwork')
        .mockReturnValue(networkConfigurationResult);
      jest.spyOn(otherOptions.hooks, 'getCaveat').mockReturnValue({
        value: {
          optionalScopes: {},
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      });
      const spyOnGrantPermissionsIncremental = jest.spyOn(
        otherOptions.hooks,
        'requestPermittedChainsPermissionIncrementalForOrigin',
      );

      await wallet_addEthereumChain({
        req: {
          params: [correctParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });

      expect(spyOnGrantPermissionsIncremental).toHaveBeenCalledTimes(1);
      expect(spyOnGrantPermissionsIncremental).toHaveBeenCalledWith({
        autoApprove: true,
        chainId: '0x64',
        metadata: {
          rpcUrl: 'https://rpc.gnosischain.com',
        },
      });
    });

    it('does not grant permissions when chain is already permitted', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'addNetwork')
        .mockReturnValue(networkConfigurationResult);

      const spyOnGrantPermissionsIncremental = jest.spyOn(
        Engine.context.PermissionController,
        'grantPermissionsIncremental',
      );
      jest.spyOn(otherOptions.hooks, 'getCaveat').mockReturnValue({
        value: {
          optionalScopes: { 'eip155:100': { accounts: [] } },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      });
      await wallet_addEthereumChain({
        req: {
          params: [correctParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });

      expect(spyOnGrantPermissionsIncremental).toHaveBeenCalledTimes(0);
    });
  });

  describe('adding new rpc endpoint without existing network configuration', () => {
    it('adds and switches to the new network', async () => {
      const spyOnAddNetwork = jest
        .spyOn(Engine.context.NetworkController, 'addNetwork')
        .mockReturnValue(networkConfigurationResult);

      const spyOnSetNetworkClientIdForDomain = jest.spyOn(
        Engine.context.SelectedNetworkController,
        'setNetworkClientIdForDomain',
      );

      await wallet_addEthereumChain({
        req: {
          params: [correctParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });
      await flushPromises();

      expect(spyOnAddNetwork).toHaveBeenCalledTimes(1);
      expect(spyOnAddNetwork).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: correctParams.chainId,
          blockExplorerUrls: correctParams.blockExplorerUrls,
          nativeCurrency: correctParams.nativeCurrency.symbol,
          name: correctParams.chainName,
        }),
      );

      expect(spyOnSetNetworkClientIdForDomain).toHaveBeenCalledTimes(1);
    });

    it('calls addTraitsToUser with chain ID list', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'addNetwork')
        .mockReturnValue(networkConfigurationResult);

      await wallet_addEthereumChain({
        req: {
          params: [correctParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });
      await flushPromises();

      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        chain_id_list: ['eip155:1', 'eip155:100'],
      });
    });

    it('tracks RPC_ADDED event with rpc_url_index: 0', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'addNetwork')
        .mockReturnValue(networkConfigurationResult);

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      await wallet_addEthereumChain({
        req: {
          params: [correctParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });
      await flushPromises();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.RPC_ADDED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          chain_id: '0x64',
          source: 'Custom Network API',
          symbol: 'xDai',
          rpc_url_index: 0,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('adding new rpc endpoint to existing network configuration', () => {
    const existingNetworkWithRpc = {
      id: 'test-network-configuration-id',
      chainId: '0x2',
      name: 'Test Chain',
      ticker: 'TST',
      rpcEndpoints: [
        {
          url: 'https://rpc.test-chain.com',
          networkClientId: '1',
        },
      ],
      defaultRpcEndpointIndex: 0,
      blockExplorerUrls: ['https://explorer.test-chain.com'],
      defaultBlockExplorerUrlIndex: 0,
    };

    const updatedNetworkResult = {
      ...existingNetworkWithRpc,
      rpcEndpoints: [
        ...existingNetworkWithRpc.rpcEndpoints,
        {
          url: 'https://different-rpc-url.com',
          networkClientId: '2',
        },
      ],
      defaultRpcEndpointIndex: 1,
    };

    const existingNetworkParams = {
      chainId: existingNetworkWithRpc.chainId,
      rpcUrls: ['https://different-rpc-url.com'],
      chainName: existingNetworkWithRpc.name,
      nativeCurrency: {
        name: existingNetworkWithRpc.ticker,
        symbol: existingNetworkWithRpc.ticker,
        decimals: 18,
      },
    };

    it('updates network configuration and switches to new RPC endpoint', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'updateNetwork')
        .mockReturnValue(updatedNetworkResult);

      otherOptions.hooks.getNetworkConfigurationByChainId = jest
        .fn()
        .mockReturnValue(existingNetworkWithRpc);

      const spyOnSetNetworkClientIdForDomain = jest.spyOn(
        Engine.context.SelectedNetworkController,
        'setNetworkClientIdForDomain',
      );

      await wallet_addEthereumChain({
        req: {
          params: [existingNetworkParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });
      await flushPromises();

      expect(
        Engine.context.NetworkController.updateNetwork,
      ).toHaveBeenCalledTimes(1);
      expect(spyOnSetNetworkClientIdForDomain).toHaveBeenCalledTimes(1);
    });

    it('tracks RPC_ADDED event with rpc_url_index matching new endpoint position', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'updateNetwork')
        .mockReturnValue(updatedNetworkResult);

      otherOptions.hooks.getNetworkConfigurationByChainId = jest
        .fn()
        .mockReturnValue(existingNetworkWithRpc);

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      await wallet_addEthereumChain({
        req: {
          params: [existingNetworkParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });
      await flushPromises();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.RPC_ADDED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          chain_id: '0x2',
          source: 'Custom Network API',
          symbol: 'TST',
          rpc_url_index: 1, // Second RPC endpoint (index 1)
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('adding existing rpc endpoint', () => {
    const existingNetworkWithRpc = {
      id: 'test-network-configuration-id',
      chainId: '0x2',
      name: 'Test Chain',
      ticker: 'TST',
      rpcEndpoints: [
        {
          url: 'https://rpc.test-chain.com',
          networkClientId: '1',
        },
      ],
      defaultRpcEndpointIndex: 0,
      blockExplorerUrls: ['https://explorer.test-chain.com'],
      defaultBlockExplorerUrlIndex: 0,
    };

    const existingRpcParams = {
      chainId: existingNetworkWithRpc.chainId,
      rpcUrls: ['https://rpc.test-chain.com'], // Same URL that already exists
      chainName: existingNetworkWithRpc.name,
      nativeCurrency: {
        name: existingNetworkWithRpc.ticker,
        symbol: existingNetworkWithRpc.ticker,
        decimals: 18,
      },
    };

    it('switches to existing network without updating configuration', async () => {
      const spyOnUpdateNetwork = jest
        .spyOn(Engine.context.NetworkController, 'updateNetwork')
        .mockReturnValue(existingNetworkWithRpc);

      otherOptions.hooks.getNetworkConfigurationByChainId = jest
        .fn()
        .mockReturnValue(existingNetworkWithRpc);

      const spyOnSetNetworkClientIdForDomain = jest.spyOn(
        Engine.context.SelectedNetworkController,
        'setNetworkClientIdForDomain',
      );

      await wallet_addEthereumChain({
        req: {
          params: [existingRpcParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });
      await flushPromises();

      // Network is updated but RPC endpoints remain the same
      expect(spyOnSetNetworkClientIdForDomain).toHaveBeenCalledTimes(1);
    });

    it('does not track RPC_ADDED event', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'updateNetwork')
        .mockReturnValue(existingNetworkWithRpc);

      otherOptions.hooks.getNetworkConfigurationByChainId = jest
        .fn()
        .mockReturnValue(existingNetworkWithRpc);

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      await wallet_addEthereumChain({
        req: {
          params: [existingRpcParams],
          origin: 'https://example.com',
        },
        ...otherOptions,
      });
      await flushPromises();

      const rpcAddedCalls = mockCreateEventBuilder.mock.calls.filter(
        (call) => call[0] === MetaMetricsEvents.RPC_ADDED,
      );
      expect(rpcAddedCalls).toHaveLength(0);
    });
  });
});
