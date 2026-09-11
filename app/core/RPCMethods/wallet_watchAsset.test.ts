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
    ).toHaveBeenCalled();
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
});
