import { InteractionManager } from 'react-native';
import { providerErrors } from '@metamask/rpc-errors';
import { wallet_addEthereumChain } from './wallet_addEthereumChain';
import Engine from '../Engine';
import { mockNetworkState } from '../../util/test/network';
import MetaMetrics from '../Analytics/MetaMetrics';

/**
 * Jest doesn't automatically wait for all asynchronous operations to complete before moving to the next assertion.
 * So we need to ensure all asynchronous operations complete before checking the mock calls. So we have this util function
 */
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

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

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnThis(),
});

MetaMetrics.getInstance = jest.fn().mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: mockCreateEventBuilder,
});

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
  rpcEndpoints: [correctParams.rpcUrls[0]],
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
      startApprovalFlow: jest.fn(() => ({ id: '1', loadingText: null })),
      endApprovalFlow: jest.fn(),
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

  it('should report missing params', async () => {
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

  it('should report extra keys', async () => {
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

  it('should report invalid rpc url', async () => {
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

  it('should report invalid block explorer url', async () => {
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

  it('should report invalid chainId', async () => {
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

  it('should report unsafe chainId', async () => {
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

  it('should report chainId not matching rpcUrl returned chainId', async () => {
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

  it('should report invalid chain name', async () => {
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

  it('should report invalid native currency', async () => {
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

  it('should report invalid native currency decimals', async () => {
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

  it('should report missing native currency symbol', async () => {
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

  it('should report native currency symbol length being too long', async () => {
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

  it('should allow 1 letter native currency symbols', async () => {
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
    it('should start and end a new approval flow if chain does not already exist', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'addNetwork')
        .mockReturnValue(networkConfigurationResult);

      await wallet_addEthereumChain({
        req: {
          params: [correctParams],
        },
        ...otherOptions,
      });

      expect(otherOptions.startApprovalFlow).toBeCalledTimes(1);
      expect(otherOptions.endApprovalFlow).toBeCalledTimes(1);
    });

    it('should end approval flow even if the approval process fails', async () => {
      await expect(
        wallet_addEthereumChain({
          req: {
            params: [correctParams],
          },
          ...otherOptions,
          requestUserApproval: jest.fn(() => Promise.reject()),
        }),
      ).rejects.toThrow(providerErrors.userRejectedRequest());

      expect(otherOptions.startApprovalFlow).toBeCalledTimes(1);
      expect(otherOptions.endApprovalFlow).toBeCalledTimes(1);
    });

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

  it('should not modify/add permissions', async () => {
    jest
      .spyOn(Engine.context.NetworkController, 'addNetwork')
      .mockReturnValue(networkConfigurationResult);

    const spyOnGrantPermissionsIncremental = jest.spyOn(
      Engine.context.PermissionController,
      'grantPermissionsIncremental',
    );
    await wallet_addEthereumChain({
      req: {
        params: [correctParams],
      },
      ...otherOptions,
    });

    expect(spyOnGrantPermissionsIncremental).toHaveBeenCalledTimes(0);
  });

  it('should correctly add and switch to a new chain when chain is not already in wallet state ', async () => {
    const spyOnAddNetwork = jest
      .spyOn(Engine.context.NetworkController, 'addNetwork')
      .mockReturnValue(networkConfigurationResult);

    const spyOnSetActiveNetwork = jest.spyOn(
      Engine.context.MultichainNetworkController,
      'setActiveNetwork',
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

    expect(spyOnSetActiveNetwork).toHaveBeenCalledTimes(1);
  });

  it('should update the networkConfiguration that has a chainId that already exists in wallet state, and should switch to the existing network', async () => {
    const spyOnUpdateNetwork = jest
      .spyOn(Engine.context.NetworkController, 'updateNetwork')
      .mockReturnValue(networkConfigurationResult);

    // TODO: [ffmcgee] this is passed to switchToNetwork utils function, under `controllers`. For some reason it's not detecting it's call, even though the flow goes to this edge case...
    const spyOnSetActiveNetwork = jest.spyOn(
      Engine.context.MultichainNetworkController,
      'setActiveNetwork',
    );

    const existingParams = {
      chainId: existingNetworkConfiguration.chainId,
      rpcUrls: ['https://different-rpc-url.com'],
      chainName: existingNetworkConfiguration.nickname,
      nativeCurrency: {
        name: existingNetworkConfiguration.ticker,
        symbol: existingNetworkConfiguration.ticker,
        decimals: 18,
      },
    };

    await wallet_addEthereumChain({
      req: {
        params: [existingParams],
        origin: 'https://example.com',
      },
      ...otherOptions,
    });
    await flushPromises();

    expect(spyOnUpdateNetwork).toHaveBeenCalledWith(
      existingParams.chainId,
      expect.objectContaining({
        rpcEndpoints: expect.arrayContaining([
          {
            name: 'Test Chain',
            type: 'custom',
            url: 'https://different-rpc-url.com',
            failoverUrls: [],
          },
        ]),
        defaultRpcEndpointIndex: 1,
      }),
      undefined,
    );
    expect(spyOnSetActiveNetwork).toHaveBeenCalledTimes(1);
  });

  describe('MM_CHAIN_PERMISSIONS is enabled', () => {
    beforeAll(() => {
      process.env.MM_CHAIN_PERMISSIONS = 'true';
    });
    afterAll(() => {
      process.env.MM_CHAIN_PERMISSIONS = 'false';
    });
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('should grant permissions when chain is not already permitted', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'addNetwork')
        .mockReturnValue(networkConfigurationResult);

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
      });
    });

    it('should not grant permissions when chain is already permitted', async () => {
      jest
        .spyOn(Engine.context.NetworkController, 'addNetwork')
        .mockReturnValue(networkConfigurationResult);

      const spyOnGrantPermissionsIncremental = jest.spyOn(
        Engine.context.PermissionController,
        'grantPermissionsIncremental',
      );
      jest
        .spyOn(Engine.context.PermissionController, 'getCaveat')
        .mockReturnValue({ value: ['0x64'] });
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
});
