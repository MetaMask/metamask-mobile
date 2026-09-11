import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { getLocalActivityFees, getLocalTransactionStatus } from './helpers';

type LocalTransactionStatusInput = Parameters<
  typeof getLocalTransactionStatus
>[0];

const baseTransactionMeta = {
  chainId: '0x1',
  id: 'activity-helpers-test-tx',
  networkClientId: 'mainnet',
  time: 0,
  txParams: { from: '0xfrom' },
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

  it('maps a confirmed cancel-type tx → cancelled (not failed)', () => {
    const group = makeGroup({
      status: TransactionStatus.confirmed,
      type: TransactionType.cancel,
    });

    expect(getLocalTransactionStatus(group)).toBe('cancelled');
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

describe('getLocalActivityFees', () => {
  const nativeAsset = {
    decimals: 18,
    symbol: 'ETH',
    assetId: 'eip155:1/slip44:60',
  };
  const tokenAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

  it('returns only the gasToken fee when a gas fee token is selected (omits native base)', () => {
    const group = {
      primaryTransaction: {
        chainId: '0x1',
        txReceipt: { gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00' },
        selectedGasFeeToken: tokenAddress,
        gasFeeTokens: [
          {
            tokenAddress,
            amount: '0x64',
            decimals: 18,
            symbol: 'mUSD',
            balance: '0x0',
            gas: '0x0',
            maxFeePerGas: '0x0',
            maxPriorityFeePerGas: '0x0',
            rateWei: '0x0',
            recipient: '0x1',
          },
        ],
        txParams: {},
      },
    } as unknown as Parameters<typeof getLocalActivityFees>[0];

    expect(getLocalActivityFees(group, nativeAsset, 'ETH')).toEqual([
      expect.objectContaining({
        type: 'gasToken',
        symbol: 'mUSD',
        amount: '100',
      }),
    ]);
  });

  it('returns only the gasToken fee when there is no native receipt fee', () => {
    const group = {
      primaryTransaction: {
        chainId: '0x1',
        txReceipt: {},
        selectedGasFeeToken: tokenAddress,
        gasFeeTokens: [
          {
            tokenAddress,
            amount: '0x64',
            decimals: 18,
            symbol: 'mUSD',
            balance: '0x0',
            gas: '0x0',
            maxFeePerGas: '0x0',
            maxPriorityFeePerGas: '0x0',
            rateWei: '0x0',
            recipient: '0x1',
          },
        ],
        txParams: {},
      },
    } as unknown as Parameters<typeof getLocalActivityFees>[0];

    expect(getLocalActivityFees(group, nativeAsset, 'ETH')).toEqual([
      expect.objectContaining({ type: 'gasToken', symbol: 'mUSD' }),
    ]);
  });

  it('returns the native base fee when no gas fee token is selected', () => {
    const group = {
      primaryTransaction: {
        chainId: '0x1',
        txReceipt: { gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00' },
        txParams: {},
      },
    } as unknown as Parameters<typeof getLocalActivityFees>[0];

    expect(getLocalActivityFees(group, nativeAsset, 'ETH')).toEqual([
      expect.objectContaining({ type: 'base', symbol: 'ETH' }),
    ]);
  });
});
