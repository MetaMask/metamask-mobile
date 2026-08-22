import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { usePayFundsFailure } from './usePayFundsFailure';

const PARENT_ID = 'pay-parent';
const APPROVE_ID = 'pay-approve';
const BRIDGE_ID = 'pay-bridge';

function parentTransaction(overrides: Partial<TransactionMeta> = {}) {
  return {
    id: PARENT_ID,
    chainId: '0xa4b1',
    hash: '0xdeposit',
    status: TransactionStatus.failed,
    requiredTransactionIds: [APPROVE_ID, BRIDGE_ID],
    ...overrides,
  } as unknown as TransactionMeta;
}

function leg(
  id: string,
  type: TransactionType,
  status: TransactionStatus = TransactionStatus.confirmed,
  overrides: Partial<TransactionMeta> = {},
) {
  return {
    id,
    chainId: '0x1',
    type,
    status,
    ...overrides,
  } as unknown as TransactionMeta;
}

/** A failed Perps funding row backed by a local transaction. */
function failedItem(parent = parentTransaction()): ActivityListItem {
  return {
    type: 'perpsAddFunds',
    chainId: 'eip155:42161',
    status: 'failed',
    timestamp: 1,
    hash: '0xdeposit',
    data: { token: { amount: '100000', decimals: 6, symbol: 'USDC' } },
    raw: {
      type: 'localTransaction',
      data: {
        primaryTransaction: parent,
        initialTransaction: parent,
        transactions: [],
      },
    },
  } as unknown as ActivityListItem;
}

function stateWith(transactions: TransactionMeta[]) {
  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        TransactionController: {
          ...backgroundState.TransactionController,
          transactions,
        },
      },
    },
  };
}

function renderFailure({
  item = failedItem(),
  transactions,
  skip,
}: {
  item?: ActivityListItem;
  transactions: TransactionMeta[];
  skip?: boolean;
}) {
  const { result } = renderHookWithProvider(
    () => usePayFundsFailure(item, { skip }),
    { state: stateWith(transactions) },
  );

  return result.current;
}

describe('usePayFundsFailure', () => {
  it('returns nothing for a row that did not fail', () => {
    const item = {
      ...failedItem(),
      status: 'success',
    } as unknown as ActivityListItem;

    expect(
      renderFailure({
        item,
        transactions: [
          parentTransaction({ status: TransactionStatus.confirmed }),
        ],
      }),
    ).toBeUndefined();
  });

  it('returns nothing when skipped', () => {
    expect(
      renderFailure({
        transactions: [parentTransaction()],
        skip: true,
      }),
    ).toBeUndefined();
  });

  it('surfaces the failed approval leg error and names the leg', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(
          APPROVE_ID,
          TransactionType.tokenMethodApprove,
          TransactionStatus.failed,
          {
            hash: '0xapproveleg',
            error: {
              message: 'execution reverted: ERC20: approve to the zero address',
            },
          } as Partial<TransactionMeta>,
        ),
        leg(BRIDGE_ID, TransactionType.perpsRelayDeposit),
      ],
    });

    expect(failure).toEqual({
      message: 'execution reverted: ERC20: approve to the zero address',
      failedLeg: 'approval',
      explorerTarget: { chainId: 'eip155:1', hash: '0xapproveleg' },
    });
  });

  it('surfaces the failed relay leg error, preferring the message on its stack', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(APPROVE_ID, TransactionType.tokenMethodApprove),
        leg(
          BRIDGE_ID,
          TransactionType.perpsRelayDeposit,
          TransactionStatus.failed,
          {
            error: {
              message: 'Internal JSON-RPC error.',
              stack:
                'Error: {"data":{"message":"insufficient funds for gas * price + value"}}',
            },
          } as Partial<TransactionMeta>,
        ),
      ],
    });

    expect(failure?.failedLeg).toBe('relay');
    expect(failure?.message).toBe('insufficient funds for gas * price + value');
  });

  it('treats every canonical relay type as a relay leg', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(
          BRIDGE_ID,
          TransactionType.musdRelayDeposit,
          TransactionStatus.failed,
          { error: { message: 'relay reverted' } } as Partial<TransactionMeta>,
        ),
      ],
    });

    expect(failure?.failedLeg).toBe('relay');
    expect(failure?.message).toBe('relay reverted');
  });

  it('falls back to the parent error when the legs are healthy', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction({
          error: { message: 'execution reverted: deposit below minimum' },
        } as Partial<TransactionMeta>),
        leg(APPROVE_ID, TransactionType.tokenMethodApprove),
        leg(BRIDGE_ID, TransactionType.perpsRelayDeposit),
      ],
    });

    expect(failure).toEqual({
      message: 'execution reverted: deposit below minimum',
    });
  });

  it('falls back to the parent error when the failed leg recorded none', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction({
          error: { message: 'Deposit reverted' },
        } as Partial<TransactionMeta>),
        leg(
          BRIDGE_ID,
          TransactionType.perpsRelayDeposit,
          TransactionStatus.failed,
        ),
      ],
    });

    expect(failure?.failedLeg).toBe('relay');
    expect(failure?.message).toBe('Deposit reverted');
  });

  it('shows generic copy when nothing recorded an error', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(APPROVE_ID, TransactionType.tokenMethodApprove),
      ],
    });

    expect(failure).toEqual({
      message: strings('activity_details.failure.unknown'),
    });
  });

  it('explains a cancelled row with its error or the generic copy', () => {
    const item = {
      ...failedItem(parentTransaction({ status: TransactionStatus.cancelled })),
      status: 'cancelled',
    } as unknown as ActivityListItem;

    expect(renderFailure({ item, transactions: [] })).toEqual({
      message: strings('activity_details.failure.unknown'),
    });
  });

  it('still explains a failed row with no local transaction behind it', () => {
    const providerItem = {
      type: 'perpsAddFunds',
      chainId: 'eip155:42161',
      status: 'failed',
      timestamp: 1,
      hash: '0xmissing',
      data: {},
      raw: { type: 'perpsTransaction', data: { id: 'wallet-1' } },
    } as unknown as ActivityListItem;

    expect(renderFailure({ item: providerItem, transactions: [] })).toEqual({
      message: strings('activity_details.failure.unknown'),
    });
  });
});
