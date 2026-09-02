import { mapLocalTransaction } from '@metamask/client-utils';
import { TransactionType } from '@metamask/transaction-controller';
import type { ActivityListItem } from '../types';
import type { TransactionGroup } from './transaction-group';
import {
  enrichLocalActivity,
  prepareLocalTransactionGroup,
} from './enrich-local-activity';
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../components/UI/Earn/constants/musd';
import { getHumanReadableTokenAmount } from '../fiat';

const chainId = '0x1';
const from = '0x1111111111111111111111111111111111111111';
const to = '0x2222222222222222222222222222222222222222';

const buildGroup = (
  overrides: Partial<TransactionGroup['initialTransaction']> = {},
  groupOverrides: Partial<TransactionGroup> = {},
): TransactionGroup => {
  const initialTransaction = {
    id: 'tx-1',
    chainId,
    time: 1_700_000_000_000,
    status: 'confirmed',
    type: TransactionType.simpleSend,
    txParams: {
      from,
      to,
      value: '0x1',
      data: '0x',
    },
    ...overrides,
  } as TransactionGroup['initialTransaction'];

  return {
    initialTransaction,
    primaryTransaction: initialTransaction,
    nativeAssetSymbol: 'ETH',
    ...groupOverrides,
  };
};

const mapLocalActivity = (
  transactionGroup: TransactionGroup,
): ActivityListItem => {
  const prepared = prepareLocalTransactionGroup(transactionGroup);

  return {
    ...enrichLocalActivity(
      mapLocalTransaction(
        prepared as Parameters<typeof mapLocalTransaction>[0],
      ) as ActivityListItem,
      prepared,
    ),
    raw: { type: 'localTransaction' as const, data: transactionGroup },
  };
};

describe('local activity call-site mapping', () => {
  it('maps a simple send via client-utils and attaches mobile raw', () => {
    const transactionGroup = buildGroup();
    const item = mapLocalActivity(transactionGroup);

    expect(item).toMatchObject({
      type: 'send',
      chainId: 'eip155:1',
      status: 'success',
      data: { from, to },
      raw: { type: 'localTransaction', data: transactionGroup },
    });
  });

  it('keeps incomplete swaps as swap when the destination token is missing', () => {
    const item = mapLocalActivity(
      buildGroup(
        { type: TransactionType.swap },
        {
          sourceToken: {
            direction: 'out',
            symbol: 'ETH',
          },
        },
      ),
    );

    expect(item.type).toBe('swap');
    expect(item.data).toEqual(
      expect.objectContaining({
        sourceToken: { direction: 'out', symbol: 'ETH' },
      }),
    );
  });

  it('keeps staking deposits as stake for mobile activity kinds', () => {
    const item = mapLocalActivity(
      buildGroup({ type: TransactionType.stakingDeposit }),
    );

    expect(item.type).toBe('stake');
  });

  it('classifies nested predict deposits after client-utils mapping', () => {
    const item = mapLocalActivity(
      buildGroup({
        type: TransactionType.contractInteraction,
        nestedTransactions: [
          {
            type: TransactionType.predictDeposit,
            to,
            data: `${'0xa9059cbb'}${'0'.repeat(64)}${'0'.repeat(63)}1`,
          },
        ],
      } as never),
    );

    expect(item.type).toBe('predictionsAddFunds');
    expect(item.data).toMatchObject({
      token: {
        direction: 'in',
        amount: '1',
      },
    });
  });

  it('maps a Money Account deposit to an EOA send with the transferred mUSD amount', () => {
    const moneyAccountAddress = '0x3333333333333333333333333333333333333333';
    const moneyChainId = '0x8f';
    const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[moneyChainId];
    const item = mapLocalActivity(
      buildGroup(
        {
          chainId: moneyChainId,
          type: TransactionType.batch,
          txParams: {
            from: moneyAccountAddress,
            to,
            value: '0x0',
            data: '0x',
          },
          nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
          requiredAssets: [
            {
              address: musdAddress,
              amount: '0x2625a0',
              standard: 'erc20',
            },
          ],
        },
        { activityAccountAddress: from },
      ),
    );

    expect(item).toMatchObject({
      type: 'send',
      data: {
        from,
        to: moneyAccountAddress,
        token: {
          amount: '0x2625a0',
          assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[moneyChainId],
          decimals: 6,
          direction: 'out',
          symbol: 'mUSD',
        },
      },
    });
  });

  it('uses the EOA payment token for a cross-token Money Account deposit', () => {
    const moneyAccountAddress = '0x3333333333333333333333333333333333333333';
    const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const sourceTransaction = buildGroup({
      id: 'source-transfer',
      chainId: '0x1',
      type: TransactionType.tokenMethodTransfer,
      txParams: {
        from,
        to: usdcAddress,
        value: '0x0',
        data: '0x',
      },
      transferInformation: {
        amount: '4000000',
        contractAddress: usdcAddress,
        decimals: 6,
        symbol: 'USDC',
      },
    }).initialTransaction;
    const item = mapLocalActivity(
      buildGroup(
        {
          chainId: '0x8f',
          type: TransactionType.batch,
          txParams: {
            from: moneyAccountAddress,
            to,
            value: '0x0',
            data: '0x',
          },
          metamaskPay: {
            chainId: '0x1',
            tokenAddress: usdcAddress,
          },
          nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
          requiredAssets: [
            {
              address: MUSD_TOKEN_ADDRESS_BY_CHAIN['0x8f'],
              amount: '0x2625a0',
              standard: 'erc20',
            },
          ],
        },
        {
          activityAccountAddress: from,
          relatedTransactions: [sourceTransaction],
        },
      ),
    );

    expect(item).toMatchObject({
      type: 'send',
      data: {
        from,
        to: moneyAccountAddress,
        token: {
          amount: '4000000',
          decimals: 6,
          direction: 'out',
          symbol: 'USDC',
        },
      },
    });
  });

  it('maps a Money Account withdrawal to an EOA receive with the transferred mUSD amount', () => {
    const moneyAccountAddress = '0x3333333333333333333333333333333333333333';
    const moneyChainId = '0x8f';
    const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[moneyChainId];
    const transferData = `0xa9059cbb${from
      .slice(2)
      .padStart(64, '0')}${(1_750_000)
      .toString(16)
      .padStart(64, '0')}` as `0x${string}`;
    const item = mapLocalActivity(
      buildGroup(
        {
          chainId: moneyChainId,
          type: TransactionType.batch,
          txParams: {
            from: moneyAccountAddress,
            to,
            value: '0x0',
            data: '0x',
          },
          nestedTransactions: [
            { type: TransactionType.moneyAccountWithdraw },
            {
              type: TransactionType.tokenMethodTransfer,
              to: musdAddress,
              data: transferData,
            },
          ],
        },
        { activityAccountAddress: from },
      ),
    );

    expect(item).toMatchObject({
      type: 'receive',
      data: {
        from: moneyAccountAddress,
        to: from,
        token: {
          amount: '1750000',
          assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[moneyChainId],
          decimals: 6,
          direction: 'in',
          symbol: 'mUSD',
        },
      },
    });
  });

  it('does not mislabel a post-quote source amount as the destination token amount', () => {
    const moneyAccountAddress = '0x3333333333333333333333333333333333333333';
    const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as const;
    const relatedTransaction = buildGroup({
      id: 'pay-leg',
      type: TransactionType.tokenMethodTransfer,
      txParams: {
        from: moneyAccountAddress,
        to: usdcAddress,
        value: '0x0',
        data: `0xa9059cbb${from.slice(2).padStart(64, '0')}${(7_000_000)
          .toString(16)
          .padStart(64, '0')}` as `0x${string}`,
      },
      transferInformation: {
        amount: '7000000',
        contractAddress: usdcAddress,
        decimals: 6,
        symbol: 'USDC',
      },
    }).initialTransaction;
    const item = mapLocalActivity(
      buildGroup(
        {
          chainId: '0x8f',
          type: TransactionType.batch,
          txParams: {
            from: moneyAccountAddress,
            to,
            value: '0x0',
            data: '0x',
          },
          metamaskPay: {
            chainId: '0x1',
            isPostQuote: true,
            tokenAddress: usdcAddress,
          },
          nestedTransactions: [{ type: TransactionType.moneyAccountWithdraw }],
        },
        {
          activityAccountAddress: from,
          transactionPayData: {
            isPostQuote: true,
            paymentToken: {
              address: usdcAddress,
              balanceFiat: '100',
              balanceHuman: '100',
              balanceRaw: '100000000',
              balanceUsd: '100',
              chainId: '0x1',
              decimals: 6,
              symbol: 'USDC',
            },
            sourceAmounts: [
              {
                sourceAmountHuman: '5',
                sourceAmountRaw: '5000000',
                targetTokenAddress: usdcAddress,
              },
            ],
          },
          relatedTransactions: [relatedTransaction],
        },
      ),
    );

    expect(item).toMatchObject({
      type: 'receive',
      data: {
        from: moneyAccountAddress,
        to: from,
        token: {
          direction: 'in',
        },
      },
    });
    expect(item.type).toBe('receive');
    if (item.type === 'receive') {
      const token = item.data.token;
      expect(token).toEqual({ direction: 'in' });
      if (!token) {
        throw new Error('Expected the receive activity to include a token');
      }
      expect(getHumanReadableTokenAmount(token)).toBeUndefined();
    }
  });

  it('attaches prepared fees when client-utils omitted them', () => {
    const fees = [
      {
        type: 'base' as const,
        amount: '21000000000000',
        decimals: 18,
        symbol: 'ETH',
      },
    ];
    const item = mapLocalActivity(
      buildGroup({ type: TransactionType.simpleSend }, { fees }),
    );

    expect(item.data).toMatchObject({ fees });
  });

  it('classifies contract deployments after client-utils mapping', () => {
    const item = mapLocalActivity(
      buildGroup({ type: TransactionType.deployContract }),
    );

    expect(item.type).toBe('contractDeployment');
  });

  it('classifies staking claims after client-utils mapping', () => {
    const item = mapLocalActivity(
      buildGroup({ type: TransactionType.stakingClaim }),
    );

    expect(item.type).toBe('claim');
  });
});
