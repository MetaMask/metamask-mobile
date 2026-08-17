import { mapLocalTransaction } from '@metamask/client-utils';
import { TransactionType } from '@metamask/transaction-controller';
import type { ActivityListItem } from '../types';
import type { TransactionGroup } from './transaction-group';
import {
  enrichLocalActivity,
  prepareLocalTransactionGroup,
} from './enrich-local-activity';

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

  it('maps incomplete swaps to swapIncomplete when the destination token is missing', () => {
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

    expect(item.type).toBe('swapIncomplete');
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
    expect(item.data).toEqual(
      expect.objectContaining({
        token: expect.objectContaining({
          direction: 'out',
          symbol: 'ETH',
        }),
      }),
    );
  });
});
