/**
 * Errors, Recovery & Information Flow — E2E-like view test.
 *
 * Simulates a trader encountering connectivity issues, retrying through
 * multiple error states, recovering, and then browsing informational UI
 * (tooltips, market badges, fill tags).
 *
 * Components covered: PerpsLoadingSkeleton, PerpsConnectionErrorView,
 * PerpsErrorState, PerpsTooltipView, PerpsBadge, PerpsFillTag
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsView,
  renderPerpsComponent,
  renderPerpsComponentDisconnected,
  renderPerpsTooltipView,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView/PerpsConnectionErrorView';
import PerpsErrorState, {
  PerpsErrorType,
} from '../components/PerpsErrorState/PerpsErrorState';
import PerpsLoadingSkeleton from '../components/PerpsLoadingSkeleton/PerpsLoadingSkeleton';
import PerpsBadge from '../components/PerpsBadge/PerpsBadge';
import PerpsFillTag from '../components/PerpsFillTag/PerpsFillTag';
import { FillType, type PerpsTransaction } from '../types/transactionHistory';

type BadgeType = 'experimental' | 'equity' | 'commodity' | 'crypto' | 'forex';

const mockOnRetry = jest.fn();

const ConnectionErrorDefault: React.FC = () => (
  <PerpsConnectionErrorView error="Connection failed" onRetry={mockOnRetry} />
);

const ConnectionErrorWithBack: React.FC = () => (
  <PerpsConnectionErrorView
    error="Connection failed"
    onRetry={mockOnRetry}
    retryAttempts={1}
  />
);

const ConnectionErrorRetrying: React.FC = () => (
  <PerpsConnectionErrorView
    error="Connection failed"
    onRetry={mockOnRetry}
    isRetrying
  />
);

const renderErrorState = (errorType: PerpsErrorType, onRetry?: () => void) =>
  renderPerpsComponent(
    PerpsErrorState as unknown as React.ComponentType<Record<string, unknown>>,
    { errorType, onRetry },
  );

const renderBadge = (type: BadgeType, customLabel?: string) =>
  renderPerpsComponent(
    PerpsBadge as unknown as React.ComponentType<Record<string, unknown>>,
    { type, customLabel },
  );

const baseTransaction: PerpsTransaction = {
  id: 'tx_1',
  type: 'trade',
  category: 'position_close',
  title: 'Closed long',
  subtitle: '2.5 ETH',
  timestamp: Date.now(),
  asset: 'ETH',
  fill: {
    shortTitle: 'Closed long',
    amount: '+$100',
    amountNumber: 100,
    isPositive: true,
    size: '2.5',
    entryPrice: '2000',
    points: '10',
    pnl: '+$100',
    fee: '$1',
    action: 'close',
    feeToken: 'USDC',
    fillType: FillType.Standard,
  },
};

const renderFillTag = (fillType: FillType) =>
  renderPerpsComponent(
    PerpsFillTag as unknown as React.ComponentType<Record<string, unknown>>,
    {
      transaction: {
        ...baseTransaction,
        fill: { ...baseTransaction.fill, fillType },
      },
    },
  );

describe('Errors, Recovery & Information Flow', () => {
  beforeEach(() => {
    mockOnRetry.mockClear();
  });

  it('trader encounters connection issues, retries through error states, recovers, then browses tooltips, badges, and fill tags', async () => {
    // ── PHASE 1: Connection attempt ──────────────────────────────────────
    // Trader opens Perps, sees loading skeleton while connecting
    renderPerpsComponentDisconnected(
      PerpsLoadingSkeleton as unknown as React.ComponentType<
        Record<string, unknown>
      >,
    );
    expect(
      await screen.findByText(strings('perps.connection.connecting_to_perps')),
    ).toBeOnTheScreen();

    // ── PHASE 2: Connection failure and retry cycle ──────────────────────
    // Connection fails — trader sees error title and retry button, no go-back
    cleanup();
    renderPerpsView(ConnectionErrorDefault, 'ConnectionErrorTest');
    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.title')),
    ).toBeOnTheScreen();
    const retryButton = screen.getByText(
      strings('perps.errors.connectionFailed.retry'),
    );
    expect(retryButton).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.errors.connectionFailed.go_back')),
    ).not.toBeOnTheScreen();

    // Trader presses retry
    fireEvent.press(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);

    // Retry fails — "Go back" button now appears alongside retry
    cleanup();
    mockOnRetry.mockClear();
    renderPerpsView(ConnectionErrorWithBack, 'ConnectionErrorTest');
    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.go_back')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.connectionFailed.retry')),
    ).toBeOnTheScreen();

    // Trader retries again — spinner replaces the retry label
    cleanup();
    renderPerpsView(ConnectionErrorRetrying, 'ConnectionErrorTest');
    await screen.findByText(strings('perps.errors.connectionFailed.title'));
    expect(
      screen.queryByText(strings('perps.errors.connectionFailed.retry')),
    ).not.toBeOnTheScreen();

    // ── PHASE 3: Error state variants ────────────────────────────────────
    // CONNECTION_FAILED error state — retry fires callback
    cleanup();
    const retryFn1 = jest.fn();
    renderErrorState(PerpsErrorType.CONNECTION_FAILED, retryFn1);
    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.title')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(strings('perps.errors.connectionFailed.retry')),
    );
    expect(retryFn1).toHaveBeenCalledTimes(1);

    // NETWORK_ERROR — title, description, and retry
    cleanup();
    const retryFn2 = jest.fn();
    renderErrorState(PerpsErrorType.NETWORK_ERROR, retryFn2);
    expect(
      await screen.findByText(strings('perps.errors.networkError.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.networkError.description')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(strings('perps.errors.networkError.retry')),
    );
    expect(retryFn2).toHaveBeenCalledTimes(1);

    // UNKNOWN without retry — no retry button
    cleanup();
    renderErrorState(PerpsErrorType.UNKNOWN);
    expect(
      await screen.findByText(strings('perps.errors.unknown.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.unknown.description')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.errors.unknown.retry')),
    ).not.toBeOnTheScreen();

    // UNKNOWN with retry — retry button fires callback
    cleanup();
    const retryFn3 = jest.fn();
    renderErrorState(PerpsErrorType.UNKNOWN, retryFn3);
    fireEvent.press(
      await screen.findByText(strings('perps.errors.unknown.retry')),
    );
    expect(retryFn3).toHaveBeenCalledTimes(1);

    // ── PHASE 4: Trader recovers and browses tooltips ────────────────────
    // Trader reads the leverage tooltip, then dismisses
    cleanup();
    renderPerpsTooltipView({ contentKey: 'leverage' });
    expect(
      await screen.findByText(strings('perps.tooltips.leverage.title')),
    ).toBeOnTheScreen();
    const gotItButton = screen.getByText(
      strings('perps.tooltips.got_it_button'),
    );
    fireEvent.press(gotItButton);

    // Trader opens margin tooltip
    cleanup();
    renderPerpsTooltipView({ contentKey: 'margin' });
    expect(
      await screen.findByText(strings('perps.tooltips.margin.title')),
    ).toBeOnTheScreen();

    // Trader opens fees tooltip
    cleanup();
    renderPerpsTooltipView({ contentKey: 'fees' });
    expect(
      await screen.findByText(strings('perps.tooltips.fees.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.tooltips.got_it_button')),
    ).toBeOnTheScreen();

    // Trader opens liquidation price tooltip
    cleanup();
    renderPerpsTooltipView({ contentKey: 'liquidation_price' });
    expect(
      await screen.findByText(
        strings('perps.tooltips.liquidation_price.title'),
      ),
    ).toBeOnTheScreen();

    // ── PHASE 5: Market badges across asset classes ──────────────────────
    const badgeTypes: BadgeType[] = [
      'experimental',
      'equity',
      'commodity',
      'crypto',
      'forex',
    ];
    for (const type of badgeTypes) {
      cleanup();
      renderBadge(type);
      expect(
        await screen.findByText(strings(`perps.market.badge.${type}`)),
      ).toBeOnTheScreen();
    }

    // Custom label overrides default badge
    cleanup();
    renderBadge('crypto', 'CUSTOM');
    expect(await screen.findByText('CUSTOM')).toBeOnTheScreen();

    // ── PHASE 6: Fill tags on past transactions ──────────────────────────
    // Standard fill — no tag visible
    cleanup();
    renderFillTag(FillType.Standard);
    expect(
      screen.queryByText(strings('perps.transactions.order.take_profit')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.transactions.order.stop_loss')),
    ).not.toBeOnTheScreen();

    // TakeProfit fill — tag visible
    cleanup();
    renderFillTag(FillType.TakeProfit);
    expect(
      await screen.findByText(strings('perps.transactions.order.take_profit')),
    ).toBeOnTheScreen();

    // StopLoss fill — tag visible
    cleanup();
    renderFillTag(FillType.StopLoss);
    expect(
      await screen.findByText(strings('perps.transactions.order.stop_loss')),
    ).toBeOnTheScreen();

    // AutoDeleveraging fill — tag visible
    cleanup();
    renderFillTag(FillType.AutoDeleveraging);
    expect(
      await screen.findByText(
        strings('perps.transactions.order.auto_deleveraging'),
      ),
    ).toBeOnTheScreen();
  });
});
