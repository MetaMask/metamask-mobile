import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  getLocalTransactionFees,
  getLocalTransactionStatus,
  getNetworkFeeAmount,
} from './helpers';

type LocalTransactionStatusInput = Parameters<
  typeof getLocalTransactionStatus
>[0];

const baseTransactionMeta = {
  chainId: '0x1',
  id: 'activity-helpers-test-tx',
  networkClientId: 'mainnet',
  time: 0,
  txParams: {},
} as const;

const makeGroup = (
  overrides: Partial<TransactionMeta> = {},
): LocalTransactionStatusInput => ({
  primaryTransaction: {
    ...baseTransactionMeta,
    txReceipt: {},
    type: 'simpleSend',
    status: TransactionStatus.submitted,
    ...overrides,
  } as TransactionMeta,
  initialTransaction: {
    ...baseTransactionMeta,
    isSmartTransaction: false,
    txParams: {},
    ...overrides,
  } as TransactionMeta & { isSmartTransaction?: boolean },
});

describe('getLocalTransactionStatus', () => {
  it('maps confirmed → success', () => {
    const group = makeGroup({ status: TransactionStatus.confirmed });

    expect(getLocalTransactionStatus(group)).toBe('success');
  });

  it('maps failed → failed', () => {
    const group = makeGroup({ status: TransactionStatus.failed });

    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps dropped → failed', () => {
    const group = makeGroup({ status: TransactionStatus.dropped });

    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps rejected → failed', () => {
    const group = makeGroup({ status: TransactionStatus.rejected });

    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps cancelled (cancel-type tx) → failed', () => {
    const group = makeGroup({
      status: TransactionStatus.confirmed,
      type: TransactionType.cancel,
    });

    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps submitted → pending', () => {
    const group = makeGroup({ status: TransactionStatus.submitted });

    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps approved → pending', () => {
    const group = makeGroup({ status: TransactionStatus.approved });

    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps unapproved → pending', () => {
    const group = makeGroup({ status: TransactionStatus.unapproved });

    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps signed → pending', () => {
    const group = makeGroup({ status: TransactionStatus.signed });

    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps receipt status 0x0 (revert) → failed', () => {
    const group = makeGroup({
      status: TransactionStatus.confirmed,
      txReceipt: { status: '0x0' },
    });

    expect(getLocalTransactionStatus(group)).toBe('failed');
  });

  it('maps smart tx pending → pending', () => {
    const group: LocalTransactionStatusInput = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        ...baseTransactionMeta,
        isSmartTransaction: true,
        status: 'pending',
      } as unknown as TransactionMeta & { isSmartTransaction?: boolean },
    };

    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps smart tx success → success', () => {
    const group: LocalTransactionStatusInput = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        ...baseTransactionMeta,
        isSmartTransaction: true,
        status: 'success',
      } as unknown as TransactionMeta & { isSmartTransaction?: boolean },
    };

    expect(getLocalTransactionStatus(group)).toBe('success');
  });

  it('maps smart tx cancelled → failed', () => {
    const group: LocalTransactionStatusInput = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        ...baseTransactionMeta,
        isSmartTransaction: true,
        status: 'cancelled',
      } as unknown as TransactionMeta & { isSmartTransaction?: boolean },
    };

    expect(getLocalTransactionStatus(group)).toBe('failed');
  });
});

describe('getNetworkFeeAmount', () => {
  it('multiplies gas used by gas price (hex inputs)', () => {
    // 21000 * 1 gwei
    expect(getNetworkFeeAmount('0x5208', '0x3b9aca00')).toBe('21000000000000');
  });

  it('returns undefined when gas used or price is missing', () => {
    expect(getNetworkFeeAmount(undefined, '0x3b9aca00')).toBeUndefined();
    expect(getNetworkFeeAmount('0x5208', undefined)).toBeUndefined();
  });

  it('returns undefined for non-numeric input', () => {
    expect(getNetworkFeeAmount('not-a-number', '0x1')).toBeUndefined();
  });
});

describe('getLocalTransactionFees', () => {
  const nativeAsset = {
    decimals: 18,
    symbol: 'ETH',
    assetId: 'eip155:1/slip44:60',
  };

  it('builds a base network fee from the receipt (gasUsed * effectiveGasPrice)', () => {
    const group = {
      primaryTransaction: {
        chainId: '0x1',
        txReceipt: { gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00' },
        txParams: {},
      },
    } as unknown as Parameters<typeof getLocalTransactionFees>[0];

    expect(getLocalTransactionFees(group, nativeAsset, 'ETH')).toEqual([
      {
        type: 'base',
        amount: '21000000000000',
        decimals: 18,
        symbol: 'ETH',
        assetId: 'eip155:1/slip44:60',
      },
    ]);
  });

  it('falls back to txParams.gasPrice while pending (no receipt)', () => {
    const group = {
      primaryTransaction: {
        chainId: '0x1',
        txReceipt: {},
        txParams: { gasPrice: '0x3b9aca00', gas: '0x5208' },
      },
    } as unknown as Parameters<typeof getLocalTransactionFees>[0];

    // No gasUsed in receipt -> no fee (mirrors extension, which keys off gasUsed)
    expect(getLocalTransactionFees(group, nativeAsset, 'ETH')).toBeUndefined();
  });

  it('returns undefined when there is no gas data', () => {
    const group = {
      primaryTransaction: { chainId: '0x1', txReceipt: {}, txParams: {} },
    } as unknown as Parameters<typeof getLocalTransactionFees>[0];

    expect(getLocalTransactionFees(group, nativeAsset, 'ETH')).toBeUndefined();
  });
});
