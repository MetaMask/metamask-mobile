/**
 * Errors, Recovery & Information Flow — E2E-like view test.
 *
 * Simulates a trader encountering connectivity issues, retrying through
 * multiple error states, recovering, and then browsing informational UI
 * (tooltips, market badges, fill tags).
 *
 * Components covered: PerpsConnectionErrorView,
 * PerpsTooltipView, PerpsBadge, PerpsFillTag
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, act, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsView,
  renderPerpsComponent,
  renderPerpsTooltipView,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView/PerpsConnectionErrorView';
import PerpsBadge from '../components/PerpsBadge/PerpsBadge';
import type { BadgeType } from '../components/PerpsBadge/PerpsBadge.types';
import PerpsFillTag from '../components/PerpsFillTag/PerpsFillTag';
import { FillType, type PerpsTransaction } from '../types/transactionHistory';

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
  let CONNECTION_FAILED_TITLE: string;
  let CONNECTION_FAILED_RETRY: string;
  let CONNECTION_FAILED_GO_BACK: string;
  let GOT_IT_BUTTON: string;

  beforeAll(() => {
    CONNECTION_FAILED_TITLE = strings('perps.errors.connectionFailed.title');
    CONNECTION_FAILED_RETRY = strings('perps.errors.connectionFailed.retry');
    CONNECTION_FAILED_GO_BACK = strings(
      'perps.errors.connectionFailed.go_back',
    );
    GOT_IT_BUTTON = strings('perps.tooltips.got_it_button');
  });

  beforeEach(() => {
    mockOnRetry.mockClear();
  });

  it('trader encounters connection issues, retries through error states, recovers, then browses tooltips, badges, and fill tags', async () => {
    // ── PHASE 1: Connection failure and retry cycle ──────────────────────
    // Connection fails — trader sees error title and retry button, no go-back
    await act(async () => {
      cleanup();
    });
    renderPerpsView(ConnectionErrorDefault, 'ConnectionErrorTest');
    expect(await screen.findByText(CONNECTION_FAILED_TITLE)).toBeOnTheScreen();
    const retryButton = screen.getByText(CONNECTION_FAILED_RETRY);
    expect(retryButton).toBeOnTheScreen();
    expect(screen.queryByText(CONNECTION_FAILED_GO_BACK)).not.toBeOnTheScreen();

    // Trader presses retry
    fireEvent.press(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);

    // Retry fails — "Go back" button now appears alongside retry
    await act(async () => {
      cleanup();
    });
    mockOnRetry.mockClear();
    renderPerpsView(ConnectionErrorWithBack, 'ConnectionErrorTest');
    expect(
      await screen.findByText(CONNECTION_FAILED_GO_BACK),
    ).toBeOnTheScreen();
    expect(screen.getByText(CONNECTION_FAILED_RETRY)).toBeOnTheScreen();

    // Trader retries again — spinner replaces the retry label
    await act(async () => {
      cleanup();
    });
    renderPerpsView(ConnectionErrorRetrying, 'ConnectionErrorTest');
    await screen.findByText(CONNECTION_FAILED_TITLE);
    expect(screen.queryByText(CONNECTION_FAILED_RETRY)).not.toBeOnTheScreen();

    // ── PHASE 2: Trader recovers and browses tooltips ────────────────────
    // Trader reads the leverage tooltip, then dismisses
    await act(async () => {
      cleanup();
    });
    renderPerpsTooltipView({ contentKey: 'leverage' });
    expect(
      await screen.findByText(strings('perps.tooltips.leverage.title')),
    ).toBeOnTheScreen();
    const gotItButton = screen.getByText(GOT_IT_BUTTON);
    fireEvent.press(gotItButton);

    // Trader opens margin tooltip
    await act(async () => {
      cleanup();
    });
    renderPerpsTooltipView({ contentKey: 'margin' });
    expect(
      await screen.findByText(strings('perps.tooltips.margin.title')),
    ).toBeOnTheScreen();

    // Trader opens fees tooltip
    await act(async () => {
      cleanup();
    });
    renderPerpsTooltipView({ contentKey: 'fees' });
    expect(
      await screen.findByText(strings('perps.tooltips.fees.title')),
    ).toBeOnTheScreen();
    expect(screen.getByText(GOT_IT_BUTTON)).toBeOnTheScreen();

    // Trader opens liquidation price tooltip
    await act(async () => {
      cleanup();
    });
    renderPerpsTooltipView({ contentKey: 'liquidation_price' });
    expect(
      await screen.findByText(
        strings('perps.tooltips.liquidation_price.title'),
      ),
    ).toBeOnTheScreen();

    // ── PHASE 3: Market badges across asset classes ──────────────────────
    const badgeTypes: BadgeType[] = [
      'experimental',
      'stock',
      'commodity',
      'crypto',
      'forex',
    ];
    for (const type of badgeTypes) {
      await act(async () => {
        cleanup();
      });
      renderBadge(type);
      expect(
        await screen.findByText(strings(`perps.market.badge.${type}`)),
      ).toBeOnTheScreen();
    }

    // Custom label overrides default badge
    await act(async () => {
      cleanup();
    });
    renderBadge('crypto', 'CUSTOM');
    expect(await screen.findByText('CUSTOM')).toBeOnTheScreen();

    // ── PHASE 4: Fill tags on past transactions ──────────────────────────
    // Standard fill — no tag visible
    await act(async () => {
      cleanup();
    });
    renderFillTag(FillType.Standard);
    expect(
      screen.queryByText(strings('perps.transactions.order.take_profit')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.transactions.order.stop_loss')),
    ).not.toBeOnTheScreen();

    // TakeProfit fill — tag visible
    await act(async () => {
      cleanup();
    });
    renderFillTag(FillType.TakeProfit);
    expect(
      await screen.findByText(strings('perps.transactions.order.take_profit')),
    ).toBeOnTheScreen();

    // StopLoss fill — tag visible
    await act(async () => {
      cleanup();
    });
    renderFillTag(FillType.StopLoss);
    expect(
      await screen.findByText(strings('perps.transactions.order.stop_loss')),
    ).toBeOnTheScreen();

    // AutoDeleveraging fill — tag visible
    await act(async () => {
      cleanup();
    });
    renderFillTag(FillType.AutoDeleveraging);
    expect(
      await screen.findByText(
        strings('perps.transactions.order.auto_deleveraging'),
      ),
    ).toBeOnTheScreen();
  });
});
