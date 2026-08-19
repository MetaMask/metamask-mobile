import { StatusTypes } from '@metamask/bridge-controller';
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

/**
 * The real selector scopes history to the selected account group, which would
 * need account-tree fixtures to exercise. The classifier's job is what the
 * statuses mean, so the map is supplied directly.
 */
let mockBridgeHistory: Record<string, unknown> = {};

jest.mock('../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: () => mockBridgeHistory,
}));

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
) {
  return { id, chainId: '0x1', type, status } as unknown as TransactionMeta;
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

const PERPS_DESTINATION = { network: 'Arbitrum', symbol: 'USDC' };

function renderFailure({
  item = failedItem(),
  transactions,
  bridgeHistory = {},
  payTotalFiat,
  destination = PERPS_DESTINATION,
}: {
  item?: ActivityListItem;
  transactions: TransactionMeta[];
  bridgeHistory?: Record<string, unknown>;
  payTotalFiat?: string;
  destination?: { network: string; symbol: string };
}) {
  mockBridgeHistory = bridgeHistory;

  const { result } = renderHookWithProvider(
    () => usePayFundsFailure(item, { destination, payTotalFiat }),
    { state: stateWith(transactions) },
  );

  return result.current;
}

describe('usePayFundsFailure', () => {
  beforeEach(() => {
    mockBridgeHistory = {};
  });

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

  it('reports an approval failure ahead of anything later', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(
          APPROVE_ID,
          TransactionType.tokenMethodApprove,
          TransactionStatus.failed,
        ),
        leg(BRIDGE_ID, TransactionType.perpsRelayDeposit),
      ],
    });

    expect(failure).toEqual({
      shape: 'approvalFailed',
      message: strings('activity_details.failure.approval_failed'),
    });
  });

  it('reports a failed bridge leg', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(APPROVE_ID, TransactionType.tokenMethodApprove),
        leg(
          BRIDGE_ID,
          TransactionType.perpsRelayDeposit,
          TransactionStatus.failed,
        ),
      ],
    });

    expect(failure?.shape).toBe('bridgeFailed');
    expect(failure?.message).toBe(
      strings('activity_details.failure.bridge_failed'),
    );
  });

  it('reports a bridge that failed off-chain even when its leg confirmed', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(BRIDGE_ID, TransactionType.perpsRelayDeposit),
      ],
      bridgeHistory: {
        [BRIDGE_ID]: { status: { status: StatusTypes.FAILED } },
      },
    });

    expect(failure?.shape).toBe('bridgeFailed');
  });

  it('names the amount waiting on Arbitrum when the bridge landed but the deposit did not', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(BRIDGE_ID, TransactionType.perpsRelayDeposit),
      ],
      bridgeHistory: {
        [BRIDGE_ID]: { status: { status: StatusTypes.COMPLETE } },
      },
      payTotalFiat: '12.53',
    });

    expect(failure?.shape).toBe('bridgedNotDeposited');
    expect(failure?.message).toContain('$12.53');
  });

  it('names the destination the calling surface bridges to', () => {
    const bridged = {
      transactions: [
        parentTransaction(),
        leg(BRIDGE_ID, TransactionType.predictRelayDeposit),
      ],
      bridgeHistory: {
        [BRIDGE_ID]: { status: { status: StatusTypes.COMPLETE } },
      },
      payTotalFiat: '12.53',
    };

    const predict = renderFailure({
      ...bridged,
      destination: { network: 'Polygon', symbol: 'USDC.e' },
    });

    expect(predict?.message).toBe(
      'You now have $12.53 of USDC.e on Polygon. Try your deposit again.',
    );

    const perps = renderFailure(bridged);

    expect(perps?.message).toBe(
      'You now have $12.53 of USDC on Arbitrum. Try your deposit again.',
    );
  });

  it('treats a failed Predict relay leg as a bridge failure', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(
          BRIDGE_ID,
          TransactionType.predictRelayDeposit,
          TransactionStatus.failed,
        ),
      ],
    });

    expect(failure?.shape).toBe('bridgeFailed');
  });

  it('drops the amount from that sentence when Pay recorded no total', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(BRIDGE_ID, TransactionType.perpsRelayDeposit),
      ],
      bridgeHistory: {
        [BRIDGE_ID]: { status: { status: StatusTypes.COMPLETE } },
      },
    });

    expect(failure?.message).toBe(
      strings('activity_details.failure.bridged_not_deposited_no_amount', {
        network: 'Arbitrum',
      }),
    );
  });

  it('reports a transaction that was never broadcast', () => {
    const failure = renderFailure({
      transactions: [parentTransaction({ hash: undefined })],
    });

    expect(failure?.shape).toBe('notSubmitted');
    expect(failure?.message).toBe(
      strings('activity_details.failure.not_submitted'),
    );
  });

  it('falls back to the generic message when state does not say how it failed', () => {
    const failure = renderFailure({
      transactions: [
        parentTransaction(),
        leg(BRIDGE_ID, TransactionType.perpsRelayDeposit),
      ],
    });

    expect(failure).toEqual({
      shape: 'unknown',
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
      shape: 'unknown',
      message: strings('activity_details.failure.unknown'),
    });
  });
});
