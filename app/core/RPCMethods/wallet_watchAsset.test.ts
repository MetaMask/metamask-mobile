import { RpcEndpointType } from '@metamask/network-controller';
import { ApprovalType } from '@metamask/controller-utils';
import Engine from '../Engine';
import { wallet_watchAsset } from './wallet_watchAsset';
// eslint-disable-next-line import-x/no-namespace
import * as transactionsUtils from '../../util/transactions';
import {
  TOKEN_NOT_SUPPORTED_FOR_NETWORK,
  TOKEN_NOT_VALID,
} from '../../constants/error';

import { mockNetworkState } from '../../util/test/network';

jest.mock('../Engine', () => {
  const {
    createMockInternalAccount,
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  } = require('../../util/test/accountsControllerTestUtils');
  const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';
  const MOCK_INTERNAL_ACCOUNT = createMockInternalAccount(
    MOCK_ADDRESS,
    'Account 1',
  );
  return {
    init: () => jest.fn(),
    context: {
      AssetsContractController: {
        getERC20TokenDecimals: jest.fn(),
        getERC721AssetSymbol: jest.fn().mockResolvedValue('WBTC'),
      },
      AssetsController: {
        addCustomAsset: jest.fn().mockResolvedValue(undefined),
      },
      ApprovalController: {
        addAndShowApprovalRequest: jest.fn().mockResolvedValue(undefined),
      },
      TokenListController: {
        state: {
          tokensChainsCache: {
            '0x1': {
              data: [],
            },
          },
        },
      },
      PermissionController: {
        requestPermissions: jest.fn(),
        getPermissions: jest.fn(),
      },
      AccountsController: {
        getSelectedAccount: jest.fn().mockReturnValue(MOCK_INTERNAL_ACCOUNT),
        getAccountByAddress: jest.fn().mockReturnValue(MOCK_INTERNAL_ACCOUNT),
      },
      SelectedNetworkController: {
        getNetworkClientIdForDomain: jest.fn(),
      },
      NetworkController: {
        getNetworkConfigurationByNetworkClientId: jest.fn(),
      },
    },
  };
});

const MockEngine = jest.mocked(Engine);

jest.mock('../Permissions', () => ({
  getPermittedAccounts: jest.fn(),
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      engine: {
        backgroundState: {
          NetworkController: {
            ...mockNetworkState({
              chainId: '0x1',
              id: '0x1',
              nickname: 'mainnet',
              ticker: 'ETH',
              type: 'infura' as RpcEndpointType,
            }),
          },
        },
      },
    })),
  },
}));

describe('wallet_watchAsset', () => {
  const ERC20 = 'ERC20';
  const correctWBTC = {
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    symbol: 'WBTC',
    decimals: '8',
    image: 'https://metamask.github.io/test-dapp/metamask-fox.svg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to the globally active network (mainnet, 0x1), matching the
    // mocked store state, so existing tests keep exercising the old path.
    MockEngine.context.SelectedNetworkController.getNetworkClientIdForDomain.mockReturnValue(
      '0x1',
    );
    MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
      { chainId: '0x1' } as ReturnType<
        typeof MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId
      >,
    );
    MockEngine.context.AccountsController.getSelectedAccount.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      require('../../util/test/accountsControllerTestUtils').createMockInternalAccount(
        '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
        'Account 1',
      ),
    );
    MockEngine.context.AccountsController.getAccountByAddress.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      require('../../util/test/accountsControllerTestUtils').createMockInternalAccount(
        '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
        'Account 1',
      ),
    );
  });

  it('should throw an error if the token address is not valid', async () => {
    await expect(
      wallet_watchAsset({
        req: {
          params: {
            options: {
              address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c59',
              symbol: '',
              decimals: '',
              image: 'https://metamask.github.io/test-dapp/metamask-fox.svg',
            },
            type: '',
          },
          jsonrpc: '2.0',
          method: '',
          id: '',
        },
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: {} as any,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkTabActive: () => null as any,
        hostname: '',
      }),
    ).rejects.toThrow(TOKEN_NOT_VALID);
  });

  it('should throw an error if the token address is not a smart contract address', async () => {
    jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(false);
    await expect(
      wallet_watchAsset({
        req: {
          params: {
            options: {
              address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
              symbol: '',
              decimals: '',
              image: 'https://metamask.github.io/test-dapp/metamask-fox.svg',
            },
            type: '',
          },
          jsonrpc: '2.0',
          method: '',
          id: '',
        },
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: {} as any,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkTabActive: () => null as any,
        hostname: '',
      }),
    ).rejects.toThrow(TOKEN_NOT_SUPPORTED_FOR_NETWORK);
  });

  it('requests user approval and adds the custom asset with legit WBTC decimals and symbol', async () => {
    jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      correctWBTC.decimals,
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      correctWBTC.symbol,
    );

    await wallet_watchAsset({
      req: {
        params: {
          options: correctWBTC,
          type: ERC20,
        },
        jsonrpc: '2.0',
        method: '',
        id: '',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res: {} as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkTabActive: () => null as any,
      hostname: '',
    });

    expect(
      MockEngine.context.ApprovalController.addAndShowApprovalRequest,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ApprovalType.WatchAsset,
        origin: '',
        requestData: expect.objectContaining({
          asset: correctWBTC,
          interactingAddress: '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
        }),
      }),
    );

    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        // addCustomAsset normalizes the address to its checksummed form so
        // the CAIP-19 id matches the ids built by other call sites.
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        symbol: correctWBTC.symbol,
        decimals: Number(correctWBTC.decimals),
        iconUrl: correctWBTC.image,
      }),
    );
  });

  it('does not add the custom asset when the approval request is rejected', async () => {
    jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      correctWBTC.decimals,
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      correctWBTC.symbol,
    );
    MockEngine.context.ApprovalController.addAndShowApprovalRequest.mockRejectedValueOnce(
      new Error('User rejected the request'),
    );

    await expect(
      wallet_watchAsset({
        req: {
          params: {
            options: correctWBTC,
            type: ERC20,
          },
          jsonrpc: '2.0',
          method: '',
          id: '',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkTabActive: () => null as any,
        hostname: '',
      }),
    ).rejects.toThrow('User rejected the request');

    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).not.toHaveBeenCalled();
  });

  it('sanitizes pageMeta properties with undefined values before requesting approval', async () => {
    jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      correctWBTC.decimals,
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      correctWBTC.symbol,
    );

    const pageMetaWithUndefined = {
      url: 'https://example.com',
      title: undefined,
      icon: undefined,
      channelId: undefined,
      analytics: {
        request_source: 'in-app-browser',
        request_platform: undefined,
      },
    };

    await expect(
      wallet_watchAsset({
        req: {
          params: {
            options: correctWBTC,
            type: ERC20,
          },
          jsonrpc: '2.0',
          method: '',
          id: '',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkTabActive: () => null as any,
        hostname: 'example.com',
        pageMeta: pageMetaWithUndefined,
      }),
    ).resolves.not.toThrow();

    const expectedSanitizedPageMeta = {
      url: 'https://example.com',
      analytics: {
        request_source: 'in-app-browser',
      },
    };

    expect(
      MockEngine.context.ApprovalController.addAndShowApprovalRequest,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'https://example.com',
        requestData: expect.objectContaining({
          pageMeta: expectedSanitizedPageMeta,
        }),
      }),
    );
  });

  it('rejects non-ERC20 assets even when the address is valid and on network', async () => {
    jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);

    await expect(
      wallet_watchAsset({
        req: {
          params: {
            options: {
              ...correctWBTC,
              decimals: '18',
            },
            type: 'ERC721',
          },
          jsonrpc: '2.0',
          method: '',
          id: '',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkTabActive: () => null as any,
        hostname: '',
      }),
    ).rejects.toThrow('Asset of type ERC721 not supported');

    expect(
      MockEngine.context.ApprovalController.addAndShowApprovalRequest,
    ).not.toHaveBeenCalled();
    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).not.toHaveBeenCalled();
  });

  it('persists the watched asset with the resolved token metadata and a numeric decimals value', async () => {
    jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      '18',
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      'TST',
    );

    await wallet_watchAsset({
      req: {
        params: {
          options: {
            address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            symbol: 'WRONG',
            decimals: '8',
            image: 'https://metamask.github.io/test-dapp/metamask-fox.svg',
          },
          type: ERC20,
        },
        jsonrpc: '2.0',
        method: '',
        id: '',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkTabActive: () => null as any,
      hostname: '',
    });

    expect(
      MockEngine.context.ApprovalController.addAndShowApprovalRequest,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        requestData: expect.objectContaining({
          asset: expect.objectContaining({
            symbol: 'TST',
            decimals: '18',
          }),
        }),
      }),
    );
    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        symbol: 'TST',
        decimals: 18,
      }),
    );
  });

  it('validates the token against the dapp-selected network, not the global network', async () => {
    // The reported bug (#40155): a WalletConnect dapp on a custom network
    // had its watchAsset request checked against the globally active
    // network (mainnet here), so a token that only exists on the custom
    // network was rejected.
    const dappChainId = '0x1234';
    const dappNetworkClientId = 'custom-network-client-id';
    MockEngine.context.SelectedNetworkController.getNetworkClientIdForDomain.mockReturnValue(
      dappNetworkClientId,
    );
    MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
      { chainId: dappChainId } as ReturnType<
        typeof MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId
      >,
    );
    const isSmartContractAddressSpy = jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      correctWBTC.decimals,
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      correctWBTC.symbol,
    );

    await wallet_watchAsset({
      req: {
        params: {
          options: correctWBTC,
          type: ERC20,
        },
        jsonrpc: '2.0',
        method: '',
        id: '',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res: {} as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkTabActive: () => null as any,
      hostname: 'dapp.example.com',
      pageMeta: {
        url: 'https://dapp.example.com',
        channelId: 'wc-channel-1',
      },
    });

    // The domain key is the WalletConnect channel id, not the hostname or
    // the page URL, matching the key wallet_switchEthereumChain stored the
    // selection under.
    expect(
      MockEngine.context.SelectedNetworkController
        .getNetworkClientIdForDomain,
    ).toHaveBeenCalledWith('wc-channel-1');
    expect(isSmartContractAddressSpy).toHaveBeenCalledWith(
      correctWBTC.address,
      dappChainId,
      dappNetworkClientId,
    );
    // The metadata fetch runs against the dapp network too. Without the
    // client id it would use the global network and could return another
    // token's decimals and symbol from the same address there.
    expect(
      MockEngine.context.AssetsContractController.getERC20TokenDecimals,
    ).toHaveBeenCalledWith(correctWBTC.address, dappNetworkClientId);
    expect(
      MockEngine.context.AssetsContractController.getERC721AssetSymbol,
    ).toHaveBeenCalledWith(correctWBTC.address, dappNetworkClientId);
    // The token is stored under the dapp network chain (eip155:4660 for
    // 0x1234), not the global network chain.
    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('eip155:4660'),
      expect.objectContaining({
        chainId: dappChainId,
      }),
    );
    // The approval request carries the dapp chain too, so the
    // confirmation sheet shows that network and its balance instead of
    // the globally active one.
    expect(
      MockEngine.context.ApprovalController.addAndShowApprovalRequest,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        requestData: expect.objectContaining({
          chainId: dappChainId,
          networkClientId: dappNetworkClientId,
        }),
      }),
    );
  });

  it('falls back to the global network when the dapp has no per-origin selection', async () => {
    const isSmartContractAddressSpy = jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      correctWBTC.decimals,
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      correctWBTC.symbol,
    );

    await wallet_watchAsset({
      req: {
        params: {
          options: correctWBTC,
          type: ERC20,
        },
        jsonrpc: '2.0',
        method: '',
        id: '',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res: {} as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkTabActive: () => null as any,
      hostname: 'example.com',
    });

    expect(isSmartContractAddressSpy).toHaveBeenCalledWith(
      correctWBTC.address,
      '0x1',
      '0x1',
    );
    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('eip155:1'),
      expect.objectContaining({
        chainId: '0x1',
      }),
    );
  });

  it('falls back to the global network when the dapp selection has no configuration', async () => {
    MockEngine.context.SelectedNetworkController.getNetworkClientIdForDomain.mockReturnValue(
      'removed-network-client-id',
    );
    MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
      undefined,
    );
    const isSmartContractAddressSpy = jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      correctWBTC.decimals,
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      correctWBTC.symbol,
    );

    await wallet_watchAsset({
      req: {
        params: {
          options: correctWBTC,
          type: ERC20,
        },
        jsonrpc: '2.0',
        method: '',
        id: '',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res: {} as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkTabActive: () => null as any,
      hostname: 'example.com',
      pageMeta: {
        url: 'https://example.com',
        channelId: 'wc-channel-1',
      },
    });

    expect(isSmartContractAddressSpy).toHaveBeenCalledWith(
      correctWBTC.address,
      '0x1',
      '0x1',
    );
  });

  it('uses the hostname as the domain when there is no channel id', async () => {
    // In-app browser flow: pageMeta carries no channel id, so the domain
    // key is the dapp hostname, matching the RPC middleware origin.
    const dappChainId = '0x1234';
    const dappNetworkClientId = 'custom-network-client-id';
    MockEngine.context.SelectedNetworkController.getNetworkClientIdForDomain.mockReturnValue(
      dappNetworkClientId,
    );
    MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
      { chainId: dappChainId } as ReturnType<
        typeof MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId
      >,
    );
    const isSmartContractAddressSpy = jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      correctWBTC.decimals,
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      correctWBTC.symbol,
    );

    await wallet_watchAsset({
      req: {
        params: {
          options: correctWBTC,
          type: ERC20,
        },
        jsonrpc: '2.0',
        method: '',
        id: '',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res: {} as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkTabActive: () => null as any,
      hostname: 'example.com',
      pageMeta: {
        url: 'https://example.com',
      },
    });

    expect(
      MockEngine.context.SelectedNetworkController
        .getNetworkClientIdForDomain,
    ).toHaveBeenCalledWith('example.com');
    expect(isSmartContractAddressSpy).toHaveBeenCalledWith(
      correctWBTC.address,
      dappChainId,
      dappNetworkClientId,
    );
  });

  it('still rejects a token that is not on the dapp-selected network', async () => {
    const dappChainId = '0x1234';
    const dappNetworkClientId = 'custom-network-client-id';
    MockEngine.context.SelectedNetworkController.getNetworkClientIdForDomain.mockReturnValue(
      dappNetworkClientId,
    );
    MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
      { chainId: dappChainId } as ReturnType<
        typeof MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId
      >,
    );
    const isSmartContractAddressSpy = jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(false);

    await expect(
      wallet_watchAsset({
        req: {
          params: {
            options: correctWBTC,
            type: ERC20,
          },
          jsonrpc: '2.0',
          method: '',
          id: '',
        },
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: {} as any,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkTabActive: () => null as any,
        hostname: 'dapp.example.com',
        pageMeta: {
          url: 'https://dapp.example.com',
          channelId: 'wc-channel-1',
        },
      }),
    ).rejects.toThrow(TOKEN_NOT_SUPPORTED_FOR_NETWORK);

    // The check ran against the dapp network, not the global one.
    expect(isSmartContractAddressSpy).toHaveBeenCalledWith(
      correctWBTC.address,
      dappChainId,
      dappNetworkClientId,
    );
    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).not.toHaveBeenCalled();
  });
});
