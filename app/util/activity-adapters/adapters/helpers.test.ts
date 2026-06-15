import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { getLocalTransactionStatus } from './helpers';

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
