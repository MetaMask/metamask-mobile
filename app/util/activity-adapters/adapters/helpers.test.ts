import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  getLocalActivityFees,
  getLocalGasTokenFee,
  getLocalTransactionFees,
  getLocalTransactionStatus,
  getNetworkFeeAmount,
  parseValueTransfers,
  type ValueTransfer,
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

  it('adds layer1GasFee (L1 + operator) onto the L2 network fee', () => {
    const group = {
      primaryTransaction: {
        chainId: '0x1388',
        layer1GasFee: '0x5f5e100', // 100_000_000
        txReceipt: { gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00' },
        txParams: {},
      },
    } as unknown as Parameters<typeof getLocalTransactionFees>[0];

    // 21_000_000_000_000 + 100_000_000
    expect(getLocalTransactionFees(group, nativeAsset, 'MNT')).toEqual([
      {
        type: 'base',
        amount: '21000100000000',
        decimals: 18,
        symbol: 'MNT',
        assetId: 'eip155:1/slip44:60',
      },
    ]);
  });

  it('falls back to receipt l1Fee when layer1GasFee is absent', () => {
    const group = {
      primaryTransaction: {
        chainId: '0xa',
        txReceipt: {
          gasUsed: '0x5208',
          effectiveGasPrice: '0x3b9aca00',
          l1Fee: '0x5f5e100',
        },
        txParams: {},
      },
    } as unknown as Parameters<typeof getLocalTransactionFees>[0];

    expect(getLocalTransactionFees(group, nativeAsset, 'ETH')).toEqual([
      {
        type: 'base',
        amount: '21000100000000',
        decimals: 18,
        symbol: 'ETH',
        assetId: 'eip155:1/slip44:60',
      },
    ]);
  });

  it('prefers layer1GasFee over receipt l1Fee to avoid double-counting', () => {
    const group = {
      primaryTransaction: {
        chainId: '0x1388',
        layer1GasFee: '0x5f5e100',
        txReceipt: {
          gasUsed: '0x5208',
          effectiveGasPrice: '0x3b9aca00',
          l1Fee: '0xffffffff',
        },
        txParams: {},
      },
    } as unknown as Parameters<typeof getLocalTransactionFees>[0];

    expect(
      getLocalTransactionFees(group, nativeAsset, 'MNT')?.[0]?.amount,
    ).toBe('21000100000000');
  });
});

describe('getLocalGasTokenFee', () => {
  const tokenAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

  it('builds a gasToken fee from selectedGasFeeToken + gasFeeTokens', () => {
    const fee = getLocalGasTokenFee({
      chainId: '0xe708',
      selectedGasFeeToken: tokenAddress,
      gasFeeTokens: [
        {
          tokenAddress,
          amount: '0xde0b6b3a7640000',
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
    } as unknown as Parameters<typeof getLocalGasTokenFee>[0]);

    expect(fee).toEqual(
      expect.objectContaining({
        type: 'gasToken',
        amount: '1000000000000000000',
        decimals: 18,
        symbol: 'mUSD',
        assetId: expect.stringContaining('erc20:'),
      }),
    );
  });

  it('returns undefined when no gas fee token is selected', () => {
    expect(
      getLocalGasTokenFee({
        chainId: '0x1',
        txParams: {},
      } as unknown as Parameters<typeof getLocalGasTokenFee>[0]),
    ).toBeUndefined();
  });

  it('returns undefined when the selected gas fee token amount is not a valid BigInt', () => {
    expect(
      getLocalGasTokenFee({
        chainId: '0x1',
        selectedGasFeeToken: tokenAddress,
        gasFeeTokens: [
          {
            tokenAddress,
            amount: 'not-a-number',
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
      } as unknown as Parameters<typeof getLocalGasTokenFee>[0]),
    ).toBeUndefined();
  });

  it('returns undefined when the selected gas fee token has no amount', () => {
    expect(
      getLocalGasTokenFee({
        chainId: '0x1',
        selectedGasFeeToken: tokenAddress,
        gasFeeTokens: [
          {
            tokenAddress,
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
      } as unknown as Parameters<typeof getLocalGasTokenFee>[0]),
    ).toBeUndefined();
  });

  it('returns undefined when the native sentinel is selected as the gas fee token', () => {
    const nativeSentinel = '0x0000000000000000000000000000000000000000';
    expect(
      getLocalGasTokenFee({
        chainId: '0x1',
        selectedGasFeeToken: nativeSentinel,
        gasFeeTokens: [
          {
            tokenAddress: nativeSentinel,
            amount: '0x64',
            decimals: 18,
            symbol: 'ETH',
            balance: '0x0',
            gas: '0x0',
            maxFeePerGas: '0x0',
            maxPriorityFeePerGas: '0x0',
            rateWei: '0x0',
            recipient: '0x1',
          },
        ],
        txParams: {},
      } as unknown as Parameters<typeof getLocalGasTokenFee>[0]),
    ).toBeUndefined();
  });

  it('returns undefined when the transaction failed and gas was never paid', () => {
    expect(
      getLocalGasTokenFee({
        chainId: '0x1',
        status: TransactionStatus.failed,
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
      } as unknown as Parameters<typeof getLocalGasTokenFee>[0]),
    ).toBeUndefined();
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

describe('parseValueTransfers', () => {
  const subjectAddress = '0xSubject';
  const other = '0xOther';
  const transfers = [
    { from: subjectAddress, to: other, symbol: 'USDC', transferType: 'erc20' },
    { from: other, to: subjectAddress, symbol: 'DAI', transferType: 'erc20' },
    { from: subjectAddress, to: other, symbol: 'NFTA', transferType: 'erc721' },
    {
      from: other,
      to: subjectAddress,
      symbol: 'NFTB',
      transferType: 'erc1155',
    },
    { from: subjectAddress, to: other, symbol: 'ETH', transferType: 'normal' },
    {
      from: other,
      to: subjectAddress,
      symbol: 'ETH',
      transferType: 'internal',
    },
  ] as unknown as ValueTransfer[];

  it('resolves the subject sent/received fungible, native, and NFT legs', () => {
    const result = parseValueTransfers(transfers, subjectAddress);

    expect(result.sentTransfer?.symbol).toBe('USDC');
    expect(result.receivedTransfer?.symbol).toBe('DAI');
    expect(result.sentNftTransfer?.symbol).toBe('NFTA');
    expect(result.receivedNftTransfer?.symbol).toBe('NFTB');
    expect(result.sentNativeTransfer?.transferType).toBe('normal');
    expect(result.receivedNativeTransfer?.transferType).toBe('internal');
  });

  it('matches the subject address case-insensitively', () => {
    const result = parseValueTransfers(transfers, subjectAddress.toLowerCase());

    expect(result.sentTransfer?.symbol).toBe('USDC');
    expect(result.receivedNftTransfer?.symbol).toBe('NFTB');
  });

  it('returns all-undefined legs for missing value transfers', () => {
    expect(parseValueTransfers(undefined, subjectAddress)).toStrictEqual({
      sentTransfer: undefined,
      receivedTransfer: undefined,
      sentNativeTransfer: undefined,
      receivedNativeTransfer: undefined,
      sentNftTransfer: undefined,
      receivedNftTransfer: undefined,
    });
  });
});
