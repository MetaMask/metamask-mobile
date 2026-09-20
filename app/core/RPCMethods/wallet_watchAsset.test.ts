import { RpcEndpointType } from '@metamask/network-controller';
import Engine from '../Engine';
import { wallet_watchAsset } from './wallet_watchAsset';
// eslint-disable-next-line import-x/no-namespace
import * as transactionsUtils from '../../util/transactions';
import {
  TOKEN_NOT_SUPPORTED_FOR_NETWORK,
  TOKEN_NOT_VALID,
} from '../../constants/error';

import { mockNetworkState } from '../../util/test/network';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../selectors/multichainAccounts/accountTreeController';

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';

const MOCK_ACCOUNT_ID = 'mock-evm-account-id';

jest.mock('../../selectors/multichainAccounts/accountTreeController', () => ({
  selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
}));

jest.mock('../Engine', () => ({
  init: () => jest.fn(),
  context: {
    AssetsContractController: {
      getERC20TokenDecimals: jest.fn(),
      getERC721AssetSymbol: jest.fn(),
      getERC20TokenName: jest.fn(),
    },
    ApprovalController: {
      add: jest.fn(),
    },
    AssetsController: {
      addCustomAsset: jest.fn(),
    },
    PermissionController: {
      requestPermissions: jest.fn(),
      getPermissions: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    SelectedNetworkController: {
      getNetworkClientIdForDomain: jest.fn(),
    },
  },
}));

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

  const callWatchAsset = async ({
    options = correctWBTC,
    type = ERC20,
    hostname = '',
    ...requestOverrides
  }: {
    options?: Record<string, string>;
    type?: string;
    hostname?: string;
    networkClientId?: string;
    origin?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pageMeta?: any;
  } = {}) =>
    wallet_watchAsset({
      req: {
        params: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options: options as any,
          type,
        },
        jsonrpc: '2.0',
        method: '',
        id: '',
        networkClientId: requestOverrides.networkClientId,
        origin: requestOverrides.origin,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkTabActive: () => null as any,
      hostname,
      pageMeta: requestOverrides.pageMeta,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(selectSelectedAccountGroupEvmInternalAccount)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ id: MOCK_ACCOUNT_ID, address: MOCK_ADDRESS } as any);
    jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(true);
    MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { chainId: '0x1' } as any,
    );
    MockEngine.context.AssetsContractController.getERC20TokenDecimals.mockResolvedValue(
      correctWBTC.decimals,
    );
    MockEngine.context.AssetsContractController.getERC721AssetSymbol.mockResolvedValue(
      correctWBTC.symbol,
    );
    MockEngine.context.AssetsContractController.getERC20TokenName.mockResolvedValue(
      'Wrapped BTC',
    );
    MockEngine.context.ApprovalController.add.mockResolvedValue(undefined);
    MockEngine.context.AssetsController.addCustomAsset.mockResolvedValue(
      undefined,
    );
  });

  it('throws when the token address is not a valid address', async () => {
    await expect(
      callWatchAsset({
        options: { ...correctWBTC, address: correctWBTC.address.slice(0, -1) },
        type: '',
      }),
    ).rejects.toThrow(TOKEN_NOT_VALID);
  });

  it('throws when the token address is not a smart contract address', async () => {
    jest
      .spyOn(transactionsUtils, 'isSmartContractAddress')
      .mockResolvedValue(false);

    await expect(callWatchAsset({ type: '' })).rejects.toThrow(
      TOKEN_NOT_SUPPORTED_FOR_NETWORK,
    );
  });

  it('throws when the asset type is not ERC20', async () => {
    await expect(callWatchAsset({ type: 'ERC721' })).rejects.toThrow(
      'Asset of type ERC721 not supported',
    );

    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).not.toHaveBeenCalled();
  });

  it('adds the asset with the on-chain symbol and decimals', async () => {
    await callWatchAsset();

    expect(MockEngine.context.ApprovalController.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'wallet_watchAsset',
        requestData: expect.objectContaining({
          interactingAddress: MOCK_ADDRESS,
          asset: {
            address: correctWBTC.address,
            symbol: 'WBTC',
            decimals: 8,
            image: correctWBTC.image,
            chainId: '0x1',
          },
        }),
      }),
    );
    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).toHaveBeenCalledWith(
      MOCK_ACCOUNT_ID,
      `eip155:1/erc20:${correctWBTC.address}`,
      {
        address: correctWBTC.address,
        symbol: 'WBTC',
        name: 'Wrapped BTC',
        decimals: 8,
        chainId: '0x1',
        unlisted: false,
        iconUrl: correctWBTC.image,
      },
    );
  });

  it('overrides the symbol and decimals reported by the dapp with the on-chain values', async () => {
    await callWatchAsset({
      options: {
        ...correctWBTC,
        symbol: 'WBTCFake',
        decimals: '16',
      },
    });

    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ symbol: 'WBTC', decimals: 8 }),
    );
  });

  it('throws when the wallet has no EVM account to add the asset to', async () => {
    jest
      .mocked(selectSelectedAccountGroupEvmInternalAccount)
      .mockReturnValue(null);

    await expect(callWatchAsset()).rejects.toThrow(
      'No EVM account available to watch the asset on.',
    );

    expect(MockEngine.context.ApprovalController.add).not.toHaveBeenCalled();
  });

  it('does not add the asset when the user rejects the approval', async () => {
    MockEngine.context.ApprovalController.add.mockRejectedValueOnce(
      new Error('User rejected the request.'),
    );

    await expect(callWatchAsset()).rejects.toThrow(
      'User rejected the request.',
    );

    expect(
      MockEngine.context.AssetsController.addCustomAsset,
    ).not.toHaveBeenCalled();
  });

  it('sanitizes pageMeta properties with undefined values before requesting approval', async () => {
    await callWatchAsset({
      hostname: 'example.com',
      pageMeta: {
        url: 'https://example.com',
        title: undefined,
        icon: undefined,
        channelId: undefined,
        analytics: {
          request_source: 'in-app-browser',
          request_platform: undefined,
        },
      },
    });

    expect(MockEngine.context.ApprovalController.add).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'https://example.com',
        requestData: expect.objectContaining({
          pageMeta: {
            url: 'https://example.com',
            analytics: {
              request_source: 'in-app-browser',
            },
          },
        }),
      }),
    );
  });

  describe('dapp-selected network', () => {
    beforeEach(() => {
      MockEngine.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { chainId: '0x38' } as any,
      );
    });

    it('validates and adds the asset on the network attached to the request', async () => {
      await callWatchAsset({
        networkClientId: 'bsc-network',
        origin: 'https://dapp.example',
        hostname: 'https://dapp.example',
      });

      expect(transactionsUtils.isSmartContractAddress).toHaveBeenCalledWith(
        correctWBTC.address,
        '0x38',
        'bsc-network',
      );
      expect(
        MockEngine.context.AssetsContractController.getERC20TokenDecimals,
      ).toHaveBeenCalledWith(correctWBTC.address, 'bsc-network');
      expect(
        MockEngine.context.AssetsContractController.getERC721AssetSymbol,
      ).toHaveBeenCalledWith(correctWBTC.address, 'bsc-network');
      expect(
        MockEngine.context.AssetsController.addCustomAsset,
      ).toHaveBeenCalledWith(
        expect.any(String),
        `eip155:56/erc20:${correctWBTC.address}`,
        expect.objectContaining({ chainId: '0x38' }),
      );
    });

    it('resolves the dapp network from SelectedNetworkController when the request has no networkClientId', async () => {
      MockEngine.context.SelectedNetworkController.getNetworkClientIdForDomain.mockReturnValue(
        'bsc-network',
      );

      await callWatchAsset({
        origin: 'https://dapp.example',
        hostname: 'https://dapp.example',
      });

      expect(
        MockEngine.context.SelectedNetworkController
          .getNetworkClientIdForDomain,
      ).toHaveBeenCalledWith('https://dapp.example');
      expect(
        MockEngine.context.AssetsController.addCustomAsset,
      ).toHaveBeenCalledWith(
        expect.any(String),
        `eip155:56/erc20:${correctWBTC.address}`,
        expect.objectContaining({ chainId: '0x38' }),
      );
    });
  });
});
