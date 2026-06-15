import { TransactionStatus } from '@metamask/transaction-controller';
import { getLocalTransactionStatus } from './helpers';

const makeGroup = (overrides: Record<string, unknown>) => ({
  primaryTransaction: {
    txReceipt: {},
    type: 'simpleSend',
    status: 'submitted',
    ...overrides,
  },
  initialTransaction: {
    isSmartTransaction: false,
    txParams: {},
    ...overrides,
  },
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
      type: 'cancel',
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
    const group = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        isSmartTransaction: true,
        status: 'pending',
      },
    };

    expect(getLocalTransactionStatus(group)).toBe('pending');
  });

  it('maps smart tx success → success', () => {
    const group = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        isSmartTransaction: true,
        status: 'success',
      },
    };

    expect(getLocalTransactionStatus(group)).toBe('success');
  });

  it('maps smart tx cancelled → failed', () => {
    const group = {
      primaryTransaction: makeGroup({}).primaryTransaction,
      initialTransaction: {
        isSmartTransaction: true,
        status: 'cancelled',
      },
    };

    expect(getLocalTransactionStatus(group)).toBe('failed');
  });
});
