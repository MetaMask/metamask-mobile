import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../../../core/Engine';
import { generateTransferData } from '../../../../../../util/transactions';
import {
  createQuickBuyTransaction,
  ensureQuickBuyTokenRegistered,
} from './createQuickBuyTransaction';
import { QUICK_BUY_TX_TYPE } from './quickBuyTransactionType';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {},
  },
}));

jest.mock('../../../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
}));

interface MockedContext {
  NetworkController: {
    findNetworkClientIdByChainId: jest.Mock<string | undefined, [Hex]>;
  };
  TransactionController: {
    addTransaction: jest.Mock<
      Promise<{ transactionMeta: { id: string } }>,
      [unknown, unknown]
    >;
  };
  TokensController?: {
    state: { allTokens: Record<string, Record<string, unknown[]>> };
    addToken: jest.Mock;
  };
}

const getContext = (): MockedContext =>
  Engine.context as unknown as MockedContext;

describe('createQuickBuyTransaction util', () => {
  const destChainId = '0x2105' as Hex; // Base
  const destTokenAddress = '0x6b175474e89094c44da98b954eedeac495271d0f' as Hex;
  const fromAddress = '0x1111111111111111111111111111111111111111' as Hex;

  beforeEach(() => {
    jest.clearAllMocks();
    (Engine as unknown as { context: MockedContext }).context = {
      NetworkController: {
        findNetworkClientIdByChainId: jest
          .fn()
          .mockReturnValue('mainnet-network-client'),
      },
      TransactionController: {
        addTransaction: jest
          .fn()
          .mockResolvedValue({ transactionMeta: { id: 'tx-id-1' } }),
      },
    };
    (generateTransferData as jest.Mock).mockReturnValue('0xENCODED_DATA');
  });

  describe('createQuickBuyTransaction', () => {
    it('adds a self-transfer transaction with the quickBuy type', async () => {
      const { transactionId, networkClientId } =
        await createQuickBuyTransaction({
          destChainId,
          destTokenAddress,
          fromAddress,
          amountHex: '0xABCD',
        });

      expect(transactionId).toBe('tx-id-1');
      expect(networkClientId).toBe('mainnet-network-client');

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: fromAddress,
        amount: '0xABCD',
      });

      expect(
        getContext().TransactionController.addTransaction,
      ).toHaveBeenCalledWith(
        {
          to: destTokenAddress,
          from: fromAddress,
          data: '0xENCODED_DATA',
          value: '0x0',
        },
        {
          skipInitialGasEstimate: true,
          networkClientId: 'mainnet-network-client',
          origin: ORIGIN_METAMASK,
          type: QUICK_BUY_TX_TYPE,
        },
      );
    });

    it('uses the provided networkClientId without re-resolving', async () => {
      await createQuickBuyTransaction({
        destChainId,
        destTokenAddress,
        fromAddress,
        amountHex: '0x01',
        networkClientId: 'precomputed-client',
      });

      expect(
        getContext().NetworkController.findNetworkClientIdByChainId,
      ).not.toHaveBeenCalled();

      const [, options] =
        getContext().TransactionController.addTransaction.mock.calls[0];
      expect((options as { networkClientId: string }).networkClientId).toBe(
        'precomputed-client',
      );
    });

    it('throws when the network client cannot be resolved', async () => {
      getContext().NetworkController.findNetworkClientIdByChainId.mockReturnValueOnce(
        undefined,
      );

      await expect(
        createQuickBuyTransaction({
          destChainId,
          destTokenAddress,
          fromAddress,
          amountHex: '0x01',
        }),
      ).rejects.toThrow(/Network client not found/);
    });
  });

  describe('ensureQuickBuyTokenRegistered', () => {
    const baseTokenArgs = {
      chainId: destChainId,
      tokenAddress: destTokenAddress,
      decimals: 18,
      symbol: 'TRUMP',
      name: 'TRUMP Token',
    };

    it('registers the token when it is not in TokensController', async () => {
      const addToken = jest.fn().mockResolvedValue(undefined);
      (
        Engine as unknown as { context: MockedContext }
      ).context.TokensController = {
        state: { allTokens: {} },
        addToken,
      };

      await ensureQuickBuyTokenRegistered(baseTokenArgs);

      expect(addToken).toHaveBeenCalledWith({
        address: destTokenAddress,
        decimals: 18,
        symbol: 'TRUMP',
        name: 'TRUMP Token',
        networkClientId: 'mainnet-network-client',
      });
    });

    it('does not re-register a token that already exists', async () => {
      const addToken = jest.fn();
      (
        Engine as unknown as { context: MockedContext }
      ).context.TokensController = {
        state: {
          allTokens: {
            [destChainId]: {
              [fromAddress]: [{ address: destTokenAddress.toUpperCase() }],
            },
          },
        },
        addToken,
      };

      await ensureQuickBuyTokenRegistered(baseTokenArgs);

      expect(addToken).not.toHaveBeenCalled();
    });

    it('is a no-op when the chain has no known network client', async () => {
      getContext().NetworkController.findNetworkClientIdByChainId.mockReturnValueOnce(
        undefined,
      );
      const addToken = jest.fn();
      (
        Engine as unknown as { context: MockedContext }
      ).context.TokensController = {
        state: { allTokens: {} },
        addToken,
      };

      await ensureQuickBuyTokenRegistered(baseTokenArgs);

      expect(addToken).not.toHaveBeenCalled();
    });
  });
});
