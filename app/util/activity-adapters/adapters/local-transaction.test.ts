import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { mapLocalTransaction } from './local-transaction';
import type { TransactionGroup } from './transaction-group';
import { toAssetId } from './shims';
import { MERKL_DISTRIBUTOR_ADDRESS } from '../../../components/UI/Earn/components/MerklRewards/constants';

const from = '0x9bed78535d6a03a955f1504aadba974d9a29e292';
const to = '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';
const mainnet = '0x1';
const base = '0x2105';
const linea = '0xe708';
const baseUsdc = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const baseAavePool = '0xa238dd80c259a72e81d7e4664a9801593f98d1c5';
const lineaDai = '0x4af15ec2a0bd43db75dd04e62faa3b8ef36b00d5';
const lineaMusd = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const wethContractAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const erc20TransferTopic =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const approveFunctionSignature = '0x095ea7b3';

const buildApproveData = (spender: string, amount: bigint) =>
  `${approveFunctionSignature}${spender
    .replace('0x', '')
    .padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
const maxUint256 = 2n ** 256n - 1n;

const withoutRaw = (item: ReturnType<typeof mapLocalTransaction>) => {
  const activity = { ...item };
  delete activity.raw;
  return activity;
};

const makeGroup = (
  transaction: Partial<TransactionMeta>,
  overrides: Partial<TransactionGroup> = {},
): TransactionGroup =>
  ({
    initialTransaction: transaction,
    primaryTransaction: transaction,
    nativeAssetSymbol: 'ETH',
    ...overrides,
  }) as TransactionGroup;

const addressTopic = (address: string) =>
  `0x${address.toLowerCase().replace('0x', '').padStart(64, '0')}`;

describe('mapLocalTransaction', () => {
  it('maps a pending native send to a Send activity', () => {
    const transaction = {
      chainId: mainnet,
      id: 'send-id',
      hash: '0xsend',
      status: TransactionStatus.submitted,
      time: 1716367781000,
      type: TransactionType.simpleSend,
      txParams: {
        from,
        to,
        value: '0x1',
      },
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'send',
      chainId: 'eip155:1',
      status: 'pending',
      timestamp: 1716367781000,
      hash: '0xsend',
      data: {
        from,
        to,
        token: {
          amount: '0x1',
          assetId: 'eip155:1/slip44:60',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
        },
      },
    });
  });

  it('maps an ERC-20 transfer without transferInformation from known token metadata', () => {
    const tokenContractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const recipient = '0xa6372EDD08c857870f9c245A17eE6895307957d5';
    const transaction = {
      chainId: mainnet,
      id: 'usdt-send-id',
      hash: '0x41f675c4a384e5064b1d9620934b0ff5e8a84f5c84530a25d025e27fb784d303',
      status: TransactionStatus.confirmed,
      time: 1779392463306,
      type: TransactionType.tokenMethodTransfer,
      txParams: {
        from,
        to: tokenContractAddress,
        value: '0x0',
        data: '0xa9059cbb000000000000000000000000a6372edd08c857870f9c245a17ee6895307957d500000000000000000000000000000000000000000000000000000000000186a0',
      },
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'send',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1779392463306,
      hash: '0x41f675c4a384e5064b1d9620934b0ff5e8a84f5c84530a25d025e27fb784d303',
      data: {
        from,
        to: recipient,
        token: {
          amount: '100000',
          assetId: toAssetId(tokenContractAddress, 'eip155:1'),
          decimals: 6,
          direction: 'out',
          symbol: 'USDT',
        },
      },
    });
  });

  it('maps a custom network native send without bridge native asset metadata', () => {
    const customChainId = '0x53a';
    const transaction = {
      chainId: customChainId,
      id: 'custom-send-id',
      hash: '0xcustomsend',
      status: TransactionStatus.confirmed,
      time: 1779392463306,
      type: TransactionType.simpleSend,
      txParams: {
        from,
        to,
        value: '0xde0b6b3a7640000',
      },
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(
        mapLocalTransaction(
          makeGroup(transaction, {
            nativeAssetSymbol: 'ETH',
            nonce: '0x1',
            transactions: [transaction as TransactionMeta],
          }),
        ),
      ),
    ).toStrictEqual({
      type: 'send',
      chainId: 'eip155:1338',
      status: 'success',
      timestamp: 1779392463306,
      hash: '0xcustomsend',
      data: {
        from,
        to,
        token: {
          amount: '0xde0b6b3a7640000',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
        },
      },
    });
  });

  it('maps a USDC transfer with transferInformation', () => {
    const tokenContractAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const recipient = '0x50A9D56C2B8BA9A5c7f2C08C3d26E0499F23a706';
    const transaction = {
      chainId: mainnet,
      id: 'token-send-id',
      hash: '0xtokensend',
      status: TransactionStatus.submitted,
      time: 1716367781000,
      transferInformation: {
        amount: '20000',
        contractAddress: tokenContractAddress,
        decimals: 6,
        symbol: 'USDC',
      },
      type: TransactionType.tokenMethodTransfer,
      txParams: {
        from,
        to: tokenContractAddress,
        data: '0xa9059cbb00000000000000000000000050a9d56c2b8ba9a5c7f2c08c3d26e0499f23a7060000000000000000000000000000000000000000000000000000000000004e20',
      },
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'send',
      chainId: 'eip155:1',
      status: 'pending',
      timestamp: 1716367781000,
      hash: '0xtokensend',
      data: {
        from,
        to: recipient,
        token: {
          amount: '20000',
          assetId: toAssetId(tokenContractAddress, 'eip155:1'),
          decimals: 6,
          direction: 'out',
          symbol: 'USDC',
        },
      },
    });
  });

  const encodeTransfer = (toAddress: string, amount: bigint) =>
    `0xa9059cbb${toAddress.slice(2).toLowerCase().padStart(64, '0')}${amount
      .toString(16)
      .padStart(64, '0')}`;

  it('maps a predict deposit batch to predictionsAddFunds with the collateral token', () => {
    const tokenContractAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const depositRecipient = '0x5f11a17142a1a5146998078ab26c8574490e841c';
    const transaction = {
      chainId: mainnet,
      id: 'predict-deposit-id',
      hash: '0xpredictdeposit',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.batch,
      txParams: { from, to: from },
      nestedTransactions: [
        {
          type: TransactionType.predictDeposit,
          to: tokenContractAddress,
          data: encodeTransfer(depositRecipient, 4000000000n),
        },
      ],
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'predictionsAddFunds',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xpredictdeposit',
      data: {
        token: {
          amount: '4000000000',
          assetId: toAssetId(tokenContractAddress, 'eip155:1'),
          decimals: 6,
          direction: 'in',
          symbol: 'USDC',
        },
      },
    });
  });

  it('maps a predictDepositAndOrder nested batch to predictionsAddFunds', () => {
    const tokenContractAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const transaction = {
      chainId: mainnet,
      id: 'predict-deposit-order-id',
      hash: '0xpredictdepositorder',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.batch,
      txParams: { from, to: from },
      nestedTransactions: [
        {
          type: TransactionType.predictDepositAndOrder,
          to: tokenContractAddress,
          data: encodeTransfer(from, 1500000n),
        },
        { type: TransactionType.contractInteraction, to: from, data: '0x' },
      ],
    } as unknown as Partial<TransactionMeta>;

    const result = withoutRaw(mapLocalTransaction(makeGroup(transaction)));
    expect(result.type).toBe('predictionsAddFunds');
    expect('token' in result.data ? result.data.token : undefined).toEqual({
      amount: '1500000',
      assetId: toAssetId(tokenContractAddress, 'eip155:1'),
      decimals: 6,
      direction: 'in',
      symbol: 'USDC',
    });
  });

  it('maps a predict withdraw batch to predictionsWithdrawFunds (out direction)', () => {
    const tokenContractAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const transaction = {
      chainId: mainnet,
      id: 'predict-withdraw-id',
      hash: '0xpredictwithdraw',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.batch,
      txParams: { from, to: from },
      nestedTransactions: [
        {
          type: TransactionType.predictWithdraw,
          to: tokenContractAddress,
          data: encodeTransfer(from, 4000000000n),
        },
      ],
    } as unknown as Partial<TransactionMeta>;

    const result = withoutRaw(mapLocalTransaction(makeGroup(transaction)));
    expect(result.type).toBe('predictionsWithdrawFunds');
    expect(
      'token' in result.data ? result.data.token?.direction : undefined,
    ).toBe('out');
    expect('token' in result.data ? result.data.token?.amount : undefined).toBe(
      '4000000000',
    );
  });

  it('falls back to USDC/6 when the collateral token metadata is unknown', () => {
    // Polymarket collateral (USDC.e on Polygon) is not in the known-token lists.
    const usdcePolygon = '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb';
    const transaction = {
      chainId: '0x89',
      id: 'predict-deposit-polygon-id',
      hash: '0xpredictdepositpolygon',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.batch,
      txParams: { from, to: from },
      nestedTransactions: [
        {
          type: TransactionType.predictDeposit,
          to: usdcePolygon,
          data: encodeTransfer(from, 1000000n),
        },
      ],
    } as unknown as Partial<TransactionMeta>;

    const result = withoutRaw(mapLocalTransaction(makeGroup(transaction)));
    expect(result.type).toBe('predictionsAddFunds');
    const token = 'token' in result.data ? result.data.token : undefined;
    expect(token?.symbol).toBe('USDC');
    expect(token?.decimals).toBe(6);
    expect(token?.amount).toBe('1000000');
  });

  it('leaves unknown token transfer symbols blank', () => {
    const tokenContractAddress = '0x1111111111111111111111111111111111111111';
    const transaction = {
      chainId: mainnet,
      id: 'unknown-token-send-id',
      hash: '0xunknown',
      status: TransactionStatus.confirmed,
      time: 1779392463306,
      type: TransactionType.tokenMethodTransfer,
      txParams: {
        from,
        to: tokenContractAddress,
        value: '0x0',
        data: '0xa9059cbb000000000000000000000000a6372edd08c857870f9c245a17ee6895307957d500000000000000000000000000000000000000000000000000000000000186a0',
      },
    } as unknown as Partial<TransactionMeta>;

    const item = mapLocalTransaction(makeGroup(transaction));

    expect(item.type).toBe('send');
    if (item.type !== 'send') {
      throw new Error(`Expected send item, got ${item.type}`);
    }

    expect(item.data.token).toStrictEqual({
      amount: '100000',
      assetId: toAssetId(tokenContractAddress, 'eip155:1'),
      direction: 'out',
    });
  });

  it('uses the original transaction type and primary transaction status', () => {
    const initialTransaction = {
      chainId: linea,
      id: 'approve-id',
      hash: '0xapprove',
      status: TransactionStatus.submitted,
      time: 1716367781000,
      transferInformation: {
        contractAddress: '0x239fd4b0c4db49fa8660e65b97619d43d0e0a79d',
        decimals: 0,
        symbol: 'TDN',
      },
      type: TransactionType.tokenMethodApprove,
      txParams: {
        from,
        to: '0x239fd4b0c4db49fa8660e65b97619d43d0e0a79d',
        data: '0xa22cb465',
      },
    } as Partial<TransactionMeta>;
    const primaryTransaction = {
      ...initialTransaction,
      id: 'retry-id',
      hash: '0xretry',
      status: TransactionStatus.approved,
      time: 1716367881000,
      type: TransactionType.retry,
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(
        mapLocalTransaction(
          makeGroup(initialTransaction, {
            hasRetried: true,
            nonce: '0x2',
            primaryTransaction: primaryTransaction as TransactionMeta,
            transactions: [
              initialTransaction as TransactionMeta,
              primaryTransaction as TransactionMeta,
            ],
          }),
        ),
      ),
    ).toStrictEqual({
      type: 'approveSpendingCap',
      chainId: 'eip155:59144',
      status: 'pending',
      timestamp: 1716367881000,
      hash: '0xretry',
      data: {
        token: {
          assetId: toAssetId(
            '0x239fd4b0c4db49fa8660e65b97619d43d0e0a79d',
            'eip155:59144',
          ),
          direction: 'out',
          symbol: 'TDN',
        },
      },
    });
  });

  it('maps an approval amount from transaction calldata', () => {
    const transaction = {
      chainId: base,
      id: 'approve-id',
      hash: '0xapprove',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      transferInformation: {
        contractAddress: baseUsdc,
        decimals: 6,
        symbol: 'USDC',
      },
      type: TransactionType.tokenMethodApprove,
      txParams: {
        from,
        to: baseUsdc,
        data: buildApproveData(to, 100000000n),
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'approveSpendingCap',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xapprove',
      data: {
        token: {
          amount: '100000000',
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
          decimals: 6,
          direction: 'out',
          symbol: 'USDC',
        },
      },
    });
  });

  it('adds receipt-derived network fees to local approval activities', () => {
    const transaction = {
      chainId: base,
      id: 'approve-fee-id',
      hash: '0xapprovefee',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      transferInformation: {
        contractAddress: baseUsdc,
        decimals: 6,
        symbol: 'USDC',
      },
      type: TransactionType.tokenMethodApprove,
      txParams: {
        from,
        to: baseUsdc,
        data: buildApproveData(to, 100000000n),
      },
      txReceipt: {
        gasUsed: '0x5208',
        effectiveGasPrice: '0x3b9aca00',
      },
    } as Partial<TransactionMeta>;

    const item = mapLocalTransaction(makeGroup(transaction));

    expect(item.type).toBe('approveSpendingCap');
    if (item.type !== 'approveSpendingCap') {
      throw new Error(`Expected approveSpendingCap item, got ${item.type}`);
    }

    expect(item.data.fees).toStrictEqual([
      expect.objectContaining({
        type: 'base',
        amount: '21000000000000',
        decimals: 18,
        symbol: 'ETH',
      }),
    ]);
  });

  it('marks unlimited approval amounts from transaction calldata', () => {
    const transaction = {
      chainId: base,
      id: 'approve-id',
      hash: '0xapprove',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      transferInformation: {
        contractAddress: baseUsdc,
        decimals: 6,
        symbol: 'USDC',
      },
      type: TransactionType.tokenMethodApprove,
      txParams: {
        from,
        to: baseUsdc,
        data: buildApproveData(to, maxUint256),
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'approveSpendingCap',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xapprove',
      data: {
        token: {
          amount: maxUint256.toString(),
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
          decimals: 6,
          direction: 'out',
          isUnlimitedApproval: true,
          symbol: 'USDC',
        },
      },
    });
  });

  it('uses bridge history token data to map a local swap', () => {
    const transaction = {
      chainId: base,
      id: 'bridge-swap-id',
      hash: '0xbridgeswap',
      status: TransactionStatus.confirmed,
      time: 1779392463306,
      type: TransactionType.swap,
      txParams: {
        from,
        to,
        value: '0x0',
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(
        mapLocalTransaction(
          makeGroup(transaction, {
            sourceToken: {
              amount: '10000000000000',
              assetId: 'eip155:8453/slip44:60',
              decimals: 18,
              direction: 'out',
              symbol: 'ETH',
            },
            destinationToken: {
              amount: '19546',
              assetId:
                'eip155:8453/erc20:0xACa92e438df0B2401fF60Da7E4337B687a2435dA',
              decimals: 6,
              direction: 'in',
              symbol: 'MUSD',
            },
          }),
        ),
      ),
    ).toStrictEqual({
      type: 'swap',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1779392463306,
      hash: '0xbridgeswap',
      data: {
        sourceToken: {
          amount: '10000000000000',
          assetId: 'eip155:8453/slip44:60',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
        },
        destinationToken: {
          amount: '19546',
          assetId:
            'eip155:8453/erc20:0xACa92e438df0B2401fF60Da7E4337B687a2435dA',
          decimals: 6,
          direction: 'in',
          symbol: 'MUSD',
        },
      },
    });
  });

  it('maps an mUSD conversion to a Convert activity', () => {
    const transaction = {
      chainId: linea,
      id: 'musd-conversion-id',
      hash: '0xmusdconversion',
      status: TransactionStatus.confirmed,
      time: 1779805800000,
      type: TransactionType.musdConversion,
      txParams: {
        from,
        to: lineaMusd,
        value: '0x0',
        data: '0xa9059cbb0000000000000000000000009bed78535d6a03a955f1504aadba974d9a29e2920000000000000000000000000000000000000000000000000000000000018703',
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(
        mapLocalTransaction(
          makeGroup(transaction, {
            sourceToken: {
              assetId: toAssetId(lineaDai, 'eip155:59144'),
              decimals: 18,
              direction: 'out',
              symbol: 'DAI',
            },
          }),
        ),
      ),
    ).toStrictEqual({
      type: 'convert',
      chainId: 'eip155:59144',
      status: 'success',
      timestamp: 1779805800000,
      hash: '0xmusdconversion',
      data: {
        sourceToken: {
          assetId: toAssetId(lineaDai, 'eip155:59144'),
          decimals: 18,
          direction: 'out',
          symbol: 'DAI',
        },
        destinationToken: {
          amount: '100099',
          assetId: toAssetId(lineaMusd, 'eip155:59144'),
          decimals: 6,
          direction: 'in',
          symbol: 'mUSD',
        },
      },
    });
  });

  it('maps an mUSD claim receipt payout to a Claim mUSD bonus activity with token amount', () => {
    const transaction = {
      chainId: linea,
      id: 'musd-claim-id',
      hash: '0xmusdclaim',
      status: TransactionStatus.confirmed,
      time: 1779805800000,
      type: TransactionType.musdClaim,
      txParams: {
        from,
        to: MERKL_DISTRIBUTOR_ADDRESS,
        value: '0x0',
      },
      txReceipt: {
        logs: [
          {
            address: lineaMusd,
            data: '0x0f4240',
            topics: [
              erc20TransferTopic,
              addressTopic(MERKL_DISTRIBUTOR_ADDRESS),
              addressTopic(from),
            ],
          },
        ],
      },
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'claimMusdBonus',
      chainId: 'eip155:59144',
      status: 'success',
      timestamp: 1779805800000,
      hash: '0xmusdclaim',
      data: {
        token: {
          amount: '1000000',
          assetId: toAssetId(lineaMusd, 'eip155:59144'),
          decimals: 6,
          direction: 'in',
          symbol: 'mUSD',
        },
      },
    });
  });

  it('maps an Aave supply contract interaction to a Lending deposit activity', () => {
    const transaction = {
      chainId: base,
      id: 'aave-supply-id',
      hash: '0x093844dd6200984f0e27d3c3a76b7a63b360bfb2136213237d693afd2cd69740',
      status: TransactionStatus.confirmed,
      time: 1779892154611,
      type: TransactionType.contractInteraction,
      txParams: {
        from,
        to: baseAavePool,
        value: '0x0',
        data: '0x617ba037000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000186a00000000000000000000000009bed78535d6a03a955f1504aadba974d9a29e2920000000000000000000000000000000000000000000000000000000000000000',
      },
      simulationData: {
        tokenBalanceChanges: [
          {
            address: baseUsdc,
            difference: '0x186a0',
            isDecrease: true,
            standard: 'erc20',
          },
        ],
      },
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'lendingDeposit',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1779892154611,
      hash: '0x093844dd6200984f0e27d3c3a76b7a63b360bfb2136213237d693afd2cd69740',
      data: {
        sourceToken: {
          amount: '100000',
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
          decimals: 6,
          direction: 'out',
          symbol: 'USDC',
        },
      },
    });
  });

  it('maps a withdraw contract interaction from the received token transfer', () => {
    const transaction = {
      chainId: base,
      hash: '0x26f4911467b538702c0945e4ec5e303de44c0c1c174897141d1b548ea3161795',
      status: TransactionStatus.confirmed,
      time: 1779912434153,
      type: TransactionType.contractInteraction,
      txParams: {
        from,
        to: baseAavePool,
        data: '0x69328dec000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000000030d400000000000000000000000009bed78535d6a03a955f1504aadba974d9a29e292',
      },
      txReceipt: {
        logs: [
          {
            address: baseUsdc,
            data: '0x0000000000000000000000000000000000000000000000000000000000030d40',
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              '0x0000000000000000000000004e65fe4dba92790696d040ac24aa414708f5c0ab',
              '0x0000000000000000000000009bed78535d6a03a955f1504aadba974d9a29e292',
            ],
          },
        ],
      },
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'lendingWithdrawal',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1779912434153,
      hash: '0x26f4911467b538702c0945e4ec5e303de44c0c1c174897141d1b548ea3161795',
      data: {
        destinationToken: {
          amount: '200000',
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
          decimals: 6,
          direction: 'in',
          symbol: 'USDC',
        },
      },
    });
  });

  it('maps an EIP-7702 upgrade (authorizationList) to a smart account upgrade activity with the gas shown as a native amount', () => {
    const transaction = {
      chainId: mainnet,
      hash: '0xupgrade',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.batch,
      txParams: {
        from,
        to,
        authorizationList: [{ address: to }],
      },
      txReceipt: { gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00' },
    } as unknown as Partial<TransactionMeta>;

    const result = withoutRaw(mapLocalTransaction(makeGroup(transaction)));
    expect(result.type).toBe('smartAccountUpgrade');
    // Renders like any other tx: native-asset avatar + the gas paid as the
    // (negative) row amount.
    expect(result.data).toEqual(
      expect.objectContaining({
        from,
        to,
        token: expect.objectContaining({
          direction: 'out',
          symbol: 'ETH',
          amount: expect.any(String),
        }),
        fees: expect.any(Array),
      }),
    );
  });

  it('keeps the action label for a batch that also performs a recognised action', () => {
    const transaction = {
      chainId: mainnet,
      hash: '0xupgradedeposit',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.batch,
      txParams: {
        from,
        to,
        authorizationList: [{ address: to }],
      },
      nestedTransactions: [
        { type: TransactionType.predictDeposit, to, data: '0x' },
      ],
    } as unknown as Partial<TransactionMeta>;

    expect(mapLocalTransaction(makeGroup(transaction)).type).toBe(
      'predictionsAddFunds',
    );
  });

  it('maps a staking deposit to a stake activity with the network fee', () => {
    const transaction = {
      chainId: mainnet,
      hash: '0xstakedeposit',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.stakingDeposit,
      txParams: { from, to },
      txReceipt: { gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00' },
    } as unknown as Partial<TransactionMeta>;

    expect(mapLocalTransaction(makeGroup(transaction))).toEqual(
      expect.objectContaining({
        type: 'stake',
        data: expect.objectContaining({ fees: expect.any(Array) }),
      }),
    );
  });

  it('maps a staking claim to a Claim activity with the native ETH amount from the simulation', () => {
    const claimedWei = `0x${(10n ** 15n).toString(16)}`;
    const transaction = {
      chainId: mainnet,
      hash: '0xstakeclaim',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.stakingClaim,
      txParams: { from, to },
      simulationData: {
        nativeBalanceChange: {
          previousBalance: '0x0',
          newBalance: claimedWei,
          difference: claimedWei,
          isDecrease: false,
        },
        tokenBalanceChanges: [],
      },
    } as unknown as Partial<TransactionMeta>;

    const result = mapLocalTransaction(makeGroup(transaction));
    expect(result.type).toBe('claim');
    expect(result.data).toEqual(
      expect.objectContaining({
        token: expect.objectContaining({
          symbol: 'ETH',
          direction: 'in',
          amount: claimedWei,
        }),
      }),
    );
  });

  it('maps a staking unstake to an Unstake activity with the native ETH amount from calldata', () => {
    const oneEthShares = (10n ** 18n).toString(16).padStart(64, '0');
    const transaction = {
      chainId: mainnet,
      hash: '0xunstake',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.stakingUnstake,
      txParams: {
        from,
        to,
        value: '0',
        data: `0x12345678${oneEthShares}${'0'.repeat(64)}`,
      },
    } as unknown as Partial<TransactionMeta>;

    const result = mapLocalTransaction(makeGroup(transaction));
    expect(result.type).toBe('unstake');
    expect(result.data).toEqual(
      expect.objectContaining({
        token: expect.objectContaining({
          symbol: 'ETH',
          direction: 'in',
          amount: `0x${(10n ** 18n).toString(16)}`,
        }),
      }),
    );
  });

  it('omits the unstake amount when the calldata is missing or too short', () => {
    const transaction = {
      chainId: mainnet,
      hash: '0xunstakenodata',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.stakingUnstake,
      txParams: { from, to, value: '0' },
    } as unknown as Partial<TransactionMeta>;

    const result = mapLocalTransaction(makeGroup(transaction));
    expect(result.type).toBe('unstake');
    const { token } = result.data as { token?: { amount?: string } };
    expect(token?.amount).toBeUndefined();
  });

  it('omits the unstake amount when the shares calldata is not valid hex', () => {
    const transaction = {
      chainId: mainnet,
      hash: '0xunstakebadhex',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.stakingUnstake,
      // 0x + 8-char selector + 64 non-hex chars -> BigInt() throws -> undefined.
      txParams: { from, to, value: '0', data: `0x12345678${'z'.repeat(64)}` },
    } as unknown as Partial<TransactionMeta>;

    const result = mapLocalTransaction(makeGroup(transaction));
    expect(result.type).toBe('unstake');
    const { token } = result.data as { token?: { amount?: string } };
    expect(token?.amount).toBeUndefined();
  });

  it('omits the claim amount when there is no native balance increase', () => {
    const transaction = {
      chainId: mainnet,
      hash: '0xclaimnosim',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.stakingClaim,
      txParams: { from, to },
    } as unknown as Partial<TransactionMeta>;

    const result = mapLocalTransaction(makeGroup(transaction));
    expect(result.type).toBe('claim');
    const { token } = result.data as { token?: { amount?: string } };
    expect(token?.amount).toBeUndefined();
  });

  it('omits the native token when the chain has no resolvable native symbol', () => {
    const transaction = {
      chainId: '0xffffff',
      hash: '0xstakenosymbol',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.stakingDeposit,
      txParams: { from, to, value: '0xde0b6b3a7640000' },
    } as unknown as Partial<TransactionMeta>;

    const result = mapLocalTransaction(
      makeGroup(transaction, { nativeAssetSymbol: undefined }),
    );
    expect(result.type).toBe('stake');
    const { token } = result.data as { token?: unknown };
    expect(token).toBeUndefined();
  });

  it('uses a bridge history activity status override', () => {
    const transaction = {
      chainId: mainnet,
      id: 'bridge-id',
      hash: '0xbridge',
      status: TransactionStatus.confirmed,
      time: 1779392463306,
      type: TransactionType.bridge,
      txParams: {
        from,
        to,
        value: '0x0',
      },
    } as Partial<TransactionMeta>;

    expect(
      mapLocalTransaction(
        makeGroup(transaction, {
          activityStatus: 'failed',
        }),
      ).status,
    ).toBe('failed');
  });

  it('maps swap metadata token symbols to a Swap activity', () => {
    const transaction = {
      chainId: base,
      id: 'swap-id',
      hash: '0xswap',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      swapMetaData: {
        token_from: 'ETH',
        token_to: 'USDC',
      },
      type: TransactionType.swap,
      txParams: {
        from,
        to: '0x9dda6ef3d919c9bc8885d5560999a3640431e8e6',
        value: '0x246139ca8000',
      },
    } as unknown as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'swap',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xswap',
      data: {
        sourceToken: {
          assetId: 'eip155:8453/slip44:60',
          direction: 'out',
          symbol: 'ETH',
        },
        destinationToken: {
          direction: 'in',
          symbol: 'USDC',
        },
      },
    });
  });

  it('adds receipt-derived network fees to local swap activities', () => {
    const transaction = {
      chainId: base,
      id: 'swap-fee-id',
      hash: '0xswapfee',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      swapMetaData: {
        token_from: 'ETH',
        token_to: 'USDC',
      },
      type: TransactionType.swap,
      txParams: {
        from,
        to: '0x9dda6ef3d919c9bc8885d5560999a3640431e8e6',
        value: '0x246139ca8000',
      },
      txReceipt: {
        gasUsed: '0x5208',
        effectiveGasPrice: '0x3b9aca00',
      },
    } as unknown as Partial<TransactionMeta>;

    const item = mapLocalTransaction(makeGroup(transaction));

    expect(item.type).toBe('swap');
    if (item.type !== 'swap') {
      throw new Error(`Expected swap item, got ${item.type}`);
    }

    expect(item.data.fees).toStrictEqual([
      expect.objectContaining({
        type: 'base',
        amount: '21000000000000',
        decimals: 18,
        symbol: 'ETH',
      }),
    ]);
  });

  it('maps a WETH9 deposit contract interaction to a Wrap activity', () => {
    const transaction = {
      chainId: mainnet,
      id: 'wrap-id',
      hash: '0xwrap',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.contractInteraction,
      txParams: {
        from,
        to: wethContractAddress,
        value: '0x3782dace9d900000',
        data: '0xd0e30db0',
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'wrap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xwrap',
      data: {
        sourceToken: {
          amount: '0x3782dace9d900000',
          assetId: 'eip155:1/slip44:60',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
        },
        destinationToken: {
          amount: '0x3782dace9d900000',
          assetId: toAssetId(wethContractAddress, 'eip155:1'),
          decimals: 18,
          direction: 'in',
          symbol: 'WETH',
        },
      },
    });
  });

  it('maps a WETH9 deposit tagged as a swap to a Wrap activity', () => {
    const transaction = {
      chainId: mainnet,
      id: 'swap-wrap-id',
      hash: '0xswapwrap',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.swap,
      swapMetaData: {
        token_from: 'ETH',
        token_to: 'WETH',
      },
      txParams: {
        from,
        to: wethContractAddress,
        value: '0x3782dace9d900000',
        data: '0xd0e30db0',
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'wrap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xswapwrap',
      data: {
        sourceToken: {
          amount: '0x3782dace9d900000',
          assetId: 'eip155:1/slip44:60',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
        },
        destinationToken: {
          amount: '0x3782dace9d900000',
          assetId: toAssetId(wethContractAddress, 'eip155:1'),
          decimals: 18,
          direction: 'in',
          symbol: 'WETH',
        },
      },
    });
  });

  it('maps a WETH9 withdraw contract interaction to an Unwrap activity', () => {
    const unwrapAmount = '1000000000000000000';
    const unwrapAmountHex = BigInt(unwrapAmount).toString(16).padStart(64, '0');
    const transaction = {
      chainId: mainnet,
      id: 'unwrap-id',
      hash: '0xunwrap',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.contractInteraction,
      txParams: {
        from,
        to: wethContractAddress,
        value: '0x0',
        data: `0x2e1a7d4d${unwrapAmountHex}`,
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'unwrap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xunwrap',
      data: {
        sourceToken: {
          amount: unwrapAmount,
          assetId: toAssetId(wethContractAddress, 'eip155:1'),
          decimals: 18,
          direction: 'out',
          symbol: 'WETH',
        },
        destinationToken: {
          amount: unwrapAmount,
          assetId: 'eip155:1/slip44:60',
          decimals: 18,
          direction: 'in',
          symbol: 'ETH',
        },
      },
    });
  });

  it('maps a WETH9 withdraw tagged as a swap to an Unwrap activity', () => {
    const unwrapAmount = '1000000000000000000';
    const unwrapAmountHex = BigInt(unwrapAmount).toString(16).padStart(64, '0');
    const transaction = {
      chainId: mainnet,
      id: 'swap-unwrap-id',
      hash: '0xswapunwrap',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.swap,
      swapMetaData: {
        token_from: 'WETH',
        token_to: 'ETH',
      },
      txParams: {
        from,
        to: wethContractAddress,
        value: '0x0',
        data: `0x2e1a7d4d${unwrapAmountHex}`,
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'unwrap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xswapunwrap',
      data: {
        sourceToken: {
          amount: unwrapAmount,
          assetId: toAssetId(wethContractAddress, 'eip155:1'),
          decimals: 18,
          direction: 'out',
          symbol: 'WETH',
        },
        destinationToken: {
          amount: unwrapAmount,
          assetId: 'eip155:1/slip44:60',
          decimals: 18,
          direction: 'in',
          symbol: 'ETH',
        },
      },
    });
  });

  it('maps a native value contract interaction with an outgoing token', () => {
    const transaction = {
      chainId: mainnet,
      id: 'contract-interaction-id',
      hash: '0xcontract',
      status: TransactionStatus.confirmed,
      time: 1716367781000,
      type: TransactionType.contractInteraction,
      txParams: {
        from,
        to,
        value: '0x3782dace9d900000',
        data: '0xd0e30db0',
      },
    } as Partial<TransactionMeta>;

    expect(
      withoutRaw(mapLocalTransaction(makeGroup(transaction))),
    ).toStrictEqual({
      type: 'contractInteraction',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1716367781000,
      hash: '0xcontract',
      data: {
        from,
        to,
        token: {
          amount: '0x3782dace9d900000',
          assetId: 'eip155:1/slip44:60',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
        },
        methodId: '0xd0e30db0',
        transactionType: TransactionType.contractInteraction,
      },
    });
  });
});
