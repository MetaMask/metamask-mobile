import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import { addTransaction } from '../../../../util/transaction-controller';
import { generateTransferData } from '../../../../util/transactions';
import { parseStandardTokenTransactionData } from '../utils/transaction';
import {
  buildHyperliquidRestoreRequest,
  buildLighterDepositRequest,
  buildLighterExistingAccountDepositRequest,
  buildRetypedRequest,
  readEnteredUsdcAmount,
  replacePerpsTransaction,
  snapshotHyperliquidConfirmation,
} from './perps-lighter-transactions';

jest.mock('../../../../core/Engine', () => ({
  context: {
    ApprovalController: { rejectRequest: jest.fn() },
    TransactionPayController: {
      state: { transactionData: {} },
      setTransactionConfig: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
}));

const USER = '0x1111111111111111111111111111111111111111';
const BRIDGE = '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';
const USDC = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const OTHER = '0x3333333333333333333333333333333333333333';

const transferData = (amount: number) =>
  generateTransferData('transfer', {
    toAddress: BRIDGE,
    amount: amount.toString(16),
  }) as Hex;

const decodedValue = (data: string | undefined) =>
  parseStandardTokenTransactionData(data)?.args?._value.toString();

function setToken(token: Record<string, string>): void {
  Engine.context.TransactionPayController.state.transactionData = {
    'tx-1': { isLoading: false, tokens: [token] },
  } as never;
}

describe('readEnteredUsdcAmount', () => {
  it('uses the raw amount', () => {
    setToken({ amountHuman: '2', amountRaw: '2000000' });

    expect(readEnteredUsdcAmount('tx-1')).toBe(2_000_000n);
  });

  it('uses the human amount when the raw amount is zero', () => {
    setToken({ amountHuman: '2', amountRaw: '0' });

    expect(readEnteredUsdcAmount('tx-1')).toBe(2_000_000n);
  });

  it('uses the human amount when the raw amount is not a number', () => {
    setToken({ amountHuman: '1', amountRaw: 'not-a-number' });

    expect(readEnteredUsdcAmount('tx-1')).toBe(1_000_000n);
  });

  it('rounds the human amount down to 6 decimals', () => {
    setToken({ amountHuman: '1.2345679' });

    expect(readEnteredUsdcAmount('tx-1')).toBe(1_234_567n);
  });

  it('is zero when the amount is empty', () => {
    setToken({ amountHuman: '0' });

    expect(readEnteredUsdcAmount('tx-1')).toBe(0n);
  });

  it('is zero when the amount is negative', () => {
    setToken({ amountHuman: '-1' });

    expect(readEnteredUsdcAmount('tx-1')).toBe(0n);
  });

  it('is zero when the transaction has no token', () => {
    Engine.context.TransactionPayController.state.transactionData = {};

    expect(readEnteredUsdcAmount('tx-1')).toBe(0n);
  });
});

describe('buildLighterDepositRequest', () => {
  it('builds a mainnet approve and deposit with the required asset', () => {
    const { params, options } = buildLighterDepositRequest({
      amount: 5_000_000n,
      from: USER,
      mainnetNetworkClientId: 'mainnet',
      origin: 'metamask',
      type: TransactionType.perpsLighterDepositAndOrder,
    });

    expect(params).toStrictEqual(
      expect.objectContaining({ from: USER, to: USER, value: '0x0' }),
    );
    expect(options).toStrictEqual(
      expect.objectContaining({
        isInternal: true,
        networkClientId: 'mainnet',
        origin: 'metamask',
        requireApproval: true,
        skipInitialGasEstimate: true,
        type: TransactionType.perpsLighterDepositAndOrder,
      }),
    );
    expect(options.nestedTransactions).toHaveLength(2);
    expect(options.requiredAssets?.[0].amount).toBe('0x4c4b40');
  });
});

describe('buildLighterExistingAccountDepositRequest', () => {
  it('builds a mainnet deposit without calldata that sets the payment provider', () => {
    const request = buildLighterExistingAccountDepositRequest({
      amount: 5_000_000n,
      from: USER,
      mainnetNetworkClientId: 'mainnet',
      origin: 'metamask',
      type: TransactionType.perpsLighterDeposit,
    });

    expect(request.params).toStrictEqual({
      from: USER,
      to: USER,
      value: '0x0',
    });
    expect(request.options).toStrictEqual({
      networkClientId: 'mainnet',
      origin: 'metamask',
      requiredAssets: [
        expect.objectContaining({ amount: '0x4c4b40', standard: 'erc20' }),
      ],
      requireApproval: true,
      skipInitialGasEstimate: true,
      type: TransactionType.perpsLighterDeposit,
    });
    expect(request.paymentProvider).toBe('lighter');
  });
});

describe('buildHyperliquidRestoreRequest', () => {
  const meta = (overrides: Partial<TransactionMeta>) =>
    ({
      id: 'tx-1',
      networkClientId: 'arbitrum',
      origin: 'metamask',
      txParams: { from: USER, to: USDC, data: transferData(1) },
      ...overrides,
    }) as TransactionMeta;

  it('re-encodes a single transfer and keeps the saved gas', () => {
    const snapshot = snapshotHyperliquidConfirmation(
      meta({
        txParams: {
          from: USER,
          to: USDC,
          data: transferData(1),
          gas: '0x30d40',
        },
        nestedTransactions: [{ to: USDC, data: transferData(1) }],
        requiredAssets: [{ address: USDC, amount: '0x1' }] as never,
      }),
    );

    const { params, options } = buildHyperliquidRestoreRequest({
      amount: 80_000_000n,
      snapshot,
      type: TransactionType.perpsDeposit,
    });

    expect(decodedValue(params.data)).toBe('80000000');
    expect(params.gas).toBe('0x30d40');
    expect(options.nestedTransactions?.[0].data).toBe(params.data);
    expect(options.requiredAssets?.[0].amount).toBe('0x4c4b400');
    expect(options.skipInitialGasEstimate).toBe(true);
  });

  it('re-encodes a transfer inside a batch', () => {
    const snapshot = snapshotHyperliquidConfirmation(
      meta({
        txParams: { from: USER, to: USER, data: '0x' },
        nestedTransactions: [
          { to: OTHER, data: '0x1234' },
          { to: USDC, data: transferData(1) },
        ],
      }),
    );

    const { params, options } = buildHyperliquidRestoreRequest({
      amount: 7n,
      snapshot,
      type: TransactionType.perpsDepositAndOrder,
    });

    expect(options.nestedTransactions?.[0]).toStrictEqual({
      to: OTHER,
      data: '0x1234',
    });
    expect(decodedValue(options.nestedTransactions?.[1].data)).toBe('7');
    expect(params.data).not.toBe('0x');
    expect(options.requiredAssets).toBeUndefined();
    expect(options.type).toBe(TransactionType.perpsDepositAndOrder);
  });

  it('keeps the calls when there is no token transfer to re-encode', () => {
    const snapshot = snapshotHyperliquidConfirmation(
      meta({ txParams: { from: USER, to: USDC, data: '0x1234' } }),
    );

    const { params } = buildHyperliquidRestoreRequest({
      amount: 7n,
      snapshot,
      type: TransactionType.perpsDeposit,
    });

    expect(params.data).toBe('0x1234');
  });

  it('does not change the snapshot', () => {
    const snapshot = snapshotHyperliquidConfirmation(
      meta({ requiredAssets: [{ address: USDC, amount: '0x1' }] as never }),
    );

    buildHyperliquidRestoreRequest({
      amount: 80_000_000n,
      snapshot,
      type: TransactionType.perpsDeposit,
    });

    expect(decodedValue(snapshot.txParams.data)).toBe('1');
    expect(snapshot.requiredAssets?.[0].amount).toBe('0x1');
  });
});

describe('buildRetypedRequest', () => {
  it('keeps the chain, calls and origin with the new type', () => {
    const nestedTransactions = [{ to: USDC, data: '0x1234' }];

    const { params, options } = buildRetypedRequest(
      {
        networkClientId: 'arbitrum',
        nestedTransactions,
        origin: 'metamask',
        txParams: { from: USER, to: USDC, data: '0x1234' },
      } as TransactionMeta,
      TransactionType.perpsLighterWithdraw,
    );

    expect(params).toStrictEqual({ from: USER, to: USDC, data: '0x1234' });
    expect(options).toStrictEqual({
      nestedTransactions,
      networkClientId: 'arbitrum',
      origin: 'metamask',
      requireApproval: true,
      type: TransactionType.perpsLighterWithdraw,
    });
  });
});

describe('replacePerpsTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds the new transaction before rejecting the previous approval', async () => {
    jest.mocked(addTransaction).mockResolvedValue({} as never);
    const request = buildRetypedRequest(
      {
        networkClientId: 'arbitrum',
        txParams: { from: USER },
      } as TransactionMeta,
      TransactionType.perpsLighterWithdraw,
    );

    await replacePerpsTransaction(request, 'tx-1');

    expect(addTransaction).toHaveBeenCalledWith(
      request.params,
      request.options,
    );
    expect(
      Engine.context.ApprovalController.rejectRequest,
    ).toHaveBeenCalledWith('tx-1', expect.anything());
    expect(
      jest.mocked(addTransaction).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(Engine.context.ApprovalController.rejectRequest).mock
        .invocationCallOrder[0],
    );
  });

  it('sets the payment provider on the new transaction before rejecting the previous approval', async () => {
    jest
      .mocked(addTransaction)
      .mockResolvedValue({ transactionMeta: { id: 'tx-2' } } as never);
    const request = buildLighterExistingAccountDepositRequest({
      amount: 1_000_000n,
      from: USER,
      mainnetNetworkClientId: 'mainnet',
      origin: undefined,
      type: TransactionType.perpsLighterDeposit,
    });

    await replacePerpsTransaction(request, 'tx-1');

    const setTransactionConfig = jest.mocked(
      Engine.context.TransactionPayController.setTransactionConfig,
    );
    expect(setTransactionConfig).toHaveBeenCalledWith(
      'tx-2',
      expect.any(Function),
    );
    expect(setTransactionConfig.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(Engine.context.ApprovalController.rejectRequest).mock
        .invocationCallOrder[0],
    );
  });

  it('does not set a payment provider when the request has none', async () => {
    jest.mocked(addTransaction).mockResolvedValue({} as never);
    const request = buildRetypedRequest(
      {
        networkClientId: 'arbitrum',
        txParams: { from: USER },
      } as TransactionMeta,
      TransactionType.perpsLighterWithdraw,
    );

    await replacePerpsTransaction(request, 'tx-1');

    expect(
      Engine.context.TransactionPayController.setTransactionConfig,
    ).not.toHaveBeenCalled();
  });

  it('keeps the previous approval when adding the transaction fails', async () => {
    jest.mocked(addTransaction).mockRejectedValue(new Error('add failed'));
    const request = buildRetypedRequest(
      {
        networkClientId: 'arbitrum',
        txParams: { from: USER },
      } as TransactionMeta,
      TransactionType.perpsLighterWithdraw,
    );

    await expect(replacePerpsTransaction(request, 'tx-1')).rejects.toThrow(
      'add failed',
    );
    expect(
      Engine.context.ApprovalController.rejectRequest,
    ).not.toHaveBeenCalled();
  });
});
