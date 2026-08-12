import type { Hex } from '@metamask/utils';

import Engine from '../../Engine';
import {
  submitMoneyAccountVaultDeposit,
  submitMoneyAccountVaultWithdraw,
} from './money-account-vault-actions';

jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionPayController: {
        submitMoneyAccountVaultDeposit: jest.fn(),
        submitMoneyAccountVaultWithdraw: jest.fn(),
      },
    },
  },
}));

const MONEY_ACCOUNT_ADDRESS =
  '0x1111111111111111111111111111111111111111' as Hex;
const TRANSACTION_HASH =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;

describe('Money Account vault actions', () => {
  const controller = Engine.context.TransactionPayController as unknown as {
    submitMoneyAccountVaultDeposit: jest.Mock;
    submitMoneyAccountVaultWithdraw: jest.Mock;
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('forwards a completed payout to TransactionPayController', async () => {
    controller.submitMoneyAccountVaultDeposit.mockResolvedValue({
      transactionHash: TRANSACTION_HASH,
    });
    const request = {
      moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
      transactionHash: TRANSACTION_HASH,
    };

    const result = await submitMoneyAccountVaultDeposit(request);

    expect(controller.submitMoneyAccountVaultDeposit).toHaveBeenCalledWith(
      request,
    );
    expect(result).toStrictEqual({ transactionHash: TRANSACTION_HASH });
  });

  it('forwards a trusted exact-out intent to TransactionPayController', async () => {
    controller.submitMoneyAccountVaultWithdraw.mockResolvedValue({
      batchId: '0xbatch',
    });
    const request = {
      amountInRaw: '5000000',
      autorampId: 'autoramp-id',
      chainId: '0x8f' as Hex,
      moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
      quoteId: 'quote-id',
      quoteValidUntil: '2026-08-12T18:00:00.000Z',
      recipient: '0x2222222222222222222222222222222222222222' as Hex,
      requestId: 'request-id',
      tokenAddress: '0x0F075aF77B28D77a60470472343B6E2941E3D17e' as Hex,
    };

    const result = await submitMoneyAccountVaultWithdraw(request);

    expect(controller.submitMoneyAccountVaultWithdraw).toHaveBeenCalledWith(
      request,
    );
    expect(result).toStrictEqual({ batchId: '0xbatch' });
  });
});
