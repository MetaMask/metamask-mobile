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

  it('forwards skipped vault deposits without inventing a hash', async () => {
    controller.submitMoneyAccountVaultDeposit.mockResolvedValue({
      skipped: true,
    });
    const request = {
      moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
      transactionHash: TRANSACTION_HASH,
      vaultDisabled: true,
    };

    const result = await submitMoneyAccountVaultDeposit(request);

    expect(result).toStrictEqual({ skipped: true });
  });

  it('forwards a slim on-chain withdraw intent to TransactionPayController', async () => {
    controller.submitMoneyAccountVaultWithdraw.mockResolvedValue({
      batchId: '0xbatch',
    });
    const request = {
      amountInRaw: '5000000',
      moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
      recipient: '0x2222222222222222222222222222222222222222' as Hex,
      requestId: 'request-id',
    };

    const result = await submitMoneyAccountVaultWithdraw(request);

    expect(controller.submitMoneyAccountVaultWithdraw).toHaveBeenCalledWith(
      request,
    );
    expect(result).toStrictEqual({ batchId: '0xbatch' });
  });
});
