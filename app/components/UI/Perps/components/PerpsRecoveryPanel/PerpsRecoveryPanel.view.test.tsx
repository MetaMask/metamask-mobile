import '../../../../../../tests/component-view/mocks';
import React from 'react';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type {
  PerpsPendingManualRecovery,
  PerpsRecoveredDispatch,
} from '@metamask/perps-controller';
import {
  renderPerpsComponent,
  defaultPositionForViews,
  defaultOrderForViews,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { usePerpsRecovery } from '../../hooks/usePerpsRecovery';
import PerpsRecoveryPanel, {
  type PerpsRecoveryPanelProps,
  type PerpsRecoveryEntry,
  type PerpsRecoveryVenueSnapshot,
} from './PerpsRecoveryPanel';
import { PerpsRecoveryPanelTestIds as IDs } from './PerpsRecoveryPanel.testIds';

const DISPATCH: PerpsRecoveredDispatch = {
  recoveryId: 'opaque-dispatch-source',
  apiKeyIndex: 7,
  acknowledgeable: true,
  kind: 14,
  intent: 'internal-order-intent',
  txHash: null,
  outcome: 'unknown',
  evidence: 'internal-venue-evidence',
};
const PENDING: PerpsRecoveredDispatch = {
  ...DISPATCH,
  recoveryId: 'opaque-pending-source',
  acknowledgeable: false,
  evidence: 'pending',
};
const PROTECTION: PerpsPendingManualRecovery = {
  symbol: 'ETH',
  settlementKey: 'internal-source-settlement',
  recordedAt: 1_790_000_000_000,
  reason: 'internal-protection-error',
  priorIntent: 'replace',
  survivingOrderIds: ['source-owned-order'],
  actionNeeded: 'internal-recovery-guidance',
};
const controller = Engine.context.PerpsController;
const getDispatches = jest.mocked(controller.getRecoveredDispatches);
const getProtections = jest.mocked(controller.getPendingManualRecoveries);
const reconcile = jest.mocked(controller.reconcileRecoveredDispatches);

const venueFor = (entry: PerpsRecoveryEntry): PerpsRecoveryVenueSnapshot => ({
  entry,
  providerId: 'lighter',
  positions: [defaultPositionForViews],
  orders: [defaultOrderForViews],
});

// These tests own presentation and local-list loading. Supplied venue snapshots
// and callback spies do not establish the strict Core API or financial seam.
// The production action owner receives separate integration coverage.
const renderPanel = ({
  review,
  isActionPending = false,
  unavailable = false,
}: {
  review?: PerpsRecoveryVenueSnapshot;
  isActionPending?: boolean;
  unavailable?: boolean;
} = {}) => {
  const controls = {
    onReview: jest.fn(),
    onAcknowledge: jest.fn(),
    onEditProtection: jest.fn(),
    onRemoveProtection: jest.fn(),
  } satisfies Pick<
    PerpsRecoveryPanelProps,
    'onReview' | 'onAcknowledge' | 'onEditProtection' | 'onRemoveProtection'
  >;
  const Owner = () => {
    const activity = usePerpsRecovery();
    const canReview = (entry: PerpsRecoveryEntry) => {
      const current = activity.captureActivity();
      return (
        current !== undefined &&
        (current.dispatches.some((candidate) => candidate === entry) ||
          current.protections.some((candidate) => candidate === entry))
      );
    };
    return (
      <PerpsRecoveryPanel
        activity={activity}
        isActionPending={isActionPending}
        review={review}
        canReview={canReview}
        canEditProtection={canReview}
        canRemoveProtection={canReview}
        onReload={activity.reload}
        onCheckStatus={activity.checkStatus}
        {...controls}
      />
    );
  };
  return {
    ...renderPerpsComponent(
      Owner,
      {},
      {
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                activeProvider: 'lighter',
                isTestnet: unavailable ? undefined : true,
              },
            },
          },
        },
      },
    ),
    controls,
  };
};

describeForPlatforms('PerpsRecoveryPanel', () => {
  beforeEach(() => {
    getDispatches.mockReset().mockResolvedValue([DISPATCH, PENDING]);
    getProtections.mockReset().mockResolvedValue([PROTECTION]);
    reconcile.mockReset().mockResolvedValue([]);
  });

  it('shows complete recovery and venue data while hiding internal identifiers', async () => {
    const review = venueFor(DISPATCH);
    const { controls } = renderPanel({ review });
    const venue = await screen.findByTestId(IDs.VENUE);
    await waitFor(() =>
      expect(screen.queryByTestId(IDs.LOADING)).not.toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId(IDs.ACKNOWLEDGE));

    expect(controls.onAcknowledge).toHaveBeenCalledWith(DISPATCH);
    const scope = within(venue);
    expect(
      scope.getByText(
        strings('perps.recovery.venue_review', { provider: 'Lighter' }),
      ),
    ).toBeOnTheScreen();
    expect(
      scope.getByText(strings('perps.recovery.positions_count', { count: 1 })),
    ).toBeOnTheScreen();
    expect(scope.getByTestId(IDs.POSITION)).toHaveTextContent(
      strings('perps.recovery.position_summary', {
        symbol: defaultPositionForViews.symbol,
        size: defaultPositionForViews.size,
        price: defaultPositionForViews.entryPrice,
      }),
    );
    expect(scope.getByTestId(IDs.ORDER)).toHaveTextContent(
      strings('perps.recovery.order_summary', {
        symbol: defaultOrderForViews.symbol,
        side: strings(`perps.recovery.${defaultOrderForViews.side}`),
        type:
          defaultOrderForViews.detailedOrderType ??
          defaultOrderForViews.orderType,
        size: defaultOrderForViews.remainingSize,
        price: defaultOrderForViews.triggerPrice ?? defaultOrderForViews.price,
      }),
    );
    expect(screen.getAllByTestId(IDs.DISPATCH)).toHaveLength(2);
    expect(
      within(screen.getByTestId(IDs.PROTECTION)).getByText(
        strings('perps.recovery.protection', { symbol: PROTECTION.symbol }),
      ),
    ).toBeOnTheScreen();
    for (const internal of [
      DISPATCH.recoveryId,
      DISPATCH.intent,
      DISPATCH.evidence,
      PROTECTION.settlementKey,
      PROTECTION.reason,
      PROTECTION.actionNeeded,
    ]) {
      expect(screen.queryByText(internal)).not.toBeOnTheScreen();
    }
  });

  it('cannot acknowledge a raw pending dispatch even with a supplied venue snapshot', async () => {
    getDispatches.mockResolvedValue([PENDING]);
    getProtections.mockResolvedValue([]);
    const { controls } = renderPanel({ review: venueFor(PENDING) });
    await screen.findByTestId(IDs.VENUE);
    await waitFor(() =>
      expect(screen.queryByTestId(IDs.LOADING)).not.toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId(IDs.REVIEW));

    expect(controls.onReview).toHaveBeenCalledWith(PENDING);
    expect(screen.queryByTestId(IDs.ACKNOWLEDGE)).not.toBeOnTheScreen();
    expect(controls.onAcknowledge).not.toHaveBeenCalled();
    expect(
      within(screen.getByTestId(IDs.DISPATCH)).getByText(
        strings('perps.recovery.pending'),
      ),
    ).toBeOnTheScreen();
  });

  it('requires the selected entry review before showing acknowledgment', async () => {
    getDispatches.mockResolvedValue([DISPATCH]);
    getProtections.mockResolvedValue([]);
    const { controls } = renderPanel();
    await screen.findByTestId(IDs.DISPATCH);
    await waitFor(() =>
      expect(screen.queryByTestId(IDs.LOADING)).not.toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId(IDs.REVIEW));

    expect(controls.onReview).toHaveBeenCalledWith(DISPATCH);
    expect(screen.queryByTestId(IDs.VENUE)).not.toBeOnTheScreen();
    expect(screen.queryByTestId(IDs.ACKNOWLEDGE)).not.toBeOnTheScreen();
    expect(controls.onAcknowledge).not.toHaveBeenCalled();
  });

  it('keeps loaded records beside a status error and disables recovery actions', async () => {
    const { controls } = renderPanel({ review: venueFor(DISPATCH) });
    await screen.findByTestId(IDs.VENUE);
    await waitFor(() =>
      expect(screen.queryByTestId(IDs.LOADING)).not.toBeOnTheScreen(),
    );
    reconcile.mockRejectedValueOnce(
      new Error('private-internal-transport-error'),
    );

    fireEvent.press(screen.getByTestId(IDs.CHECK_STATUS));
    await screen.findByTestId(IDs.ERROR);
    fireEvent.press(screen.getByTestId(IDs.ACKNOWLEDGE));

    expect(screen.getAllByTestId(IDs.DISPATCH)).toHaveLength(2);
    expect(
      within(screen.getByTestId(IDs.PROTECTION)).getByText(
        strings('perps.recovery.protection', { symbol: PROTECTION.symbol }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(IDs.ERROR)).toHaveTextContent(
      strings('perps.recovery.refresh_error'),
    );
    expect(controls.onAcknowledge).not.toHaveBeenCalled();
    expect(
      screen.queryByText('private-internal-transport-error'),
    ).not.toBeOnTheScreen();
  });

  it('does not treat unavailable network selection as a completed empty account', async () => {
    renderPanel({ unavailable: true });

    await screen.findByTestId(IDs.UNAVAILABLE);
    fireEvent.press(screen.getByTestId(IDs.CHECK_STATUS));

    expect(getDispatches).not.toHaveBeenCalled();
    expect(getProtections).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
    expect(screen.getByTestId(IDs.UNAVAILABLE)).toHaveTextContent(
      strings('perps.recovery.unavailable'),
    );
  });

  it('hides the panel only after a successful empty local read completes', async () => {
    let resolve!: (entries: PerpsRecoveredDispatch[]) => void;
    getDispatches.mockReturnValueOnce(
      new Promise<PerpsRecoveredDispatch[]>((complete) => {
        resolve = complete;
      }),
    );
    getProtections.mockResolvedValue([]);
    renderPanel();
    await screen.findByTestId(IDs.LOADING);

    await act(async () => resolve([]));

    await waitFor(() =>
      expect(screen.queryByTestId(IDs.PANEL)).not.toBeOnTheScreen(),
    );
    expect(getDispatches).toHaveBeenCalledTimes(1);
    expect(getProtections).toHaveBeenCalledTimes(1);
  });

  it('requires explicit removal confirmation and preserves the selected source entry', async () => {
    getDispatches.mockResolvedValue([]);
    const { controls } = renderPanel({ review: venueFor(PROTECTION) });
    await screen.findByTestId(IDs.VENUE);
    await waitFor(() =>
      expect(screen.queryByTestId(IDs.LOADING)).not.toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId(IDs.REMOVE_PROTECTION));
    expect(controls.onRemoveProtection).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId(IDs.CANCEL_REMOVAL));
    expect(screen.queryByTestId(IDs.CONFIRM_REMOVAL)).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(IDs.REMOVE_PROTECTION));
    fireEvent.press(screen.getByTestId(IDs.CONFIRM_REMOVAL));

    expect(controls.onRemoveProtection).toHaveBeenCalledTimes(1);
    expect(controls.onRemoveProtection).toHaveBeenCalledWith(PROTECTION);
  });
});
