/**
 * Info & Display Flow — use-case-driven view tests.
 *
 * User journey: a trader interacts with informational UI — reading tooltips
 * about trading concepts, seeing market badges on assets, and recognising
 * fill-type indicators on past transactions.
 *
 * Components covered: PerpsTooltipView, PerpsBadge, PerpsFillTag
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsTooltipView,
  renderPerpsComponent,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsBadge from '../components/PerpsBadge/PerpsBadge';
import PerpsFillTag from '../components/PerpsFillTag/PerpsFillTag';
import { FillType, type PerpsTransaction } from '../types/transactionHistory';

type BadgeType = 'experimental' | 'equity' | 'commodity' | 'crypto' | 'forex';

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

const renderFillTag = (
  fillType: FillType,
  extra: Record<string, unknown> = {},
) =>
  renderPerpsComponent(
    PerpsFillTag as unknown as React.ComponentType<Record<string, unknown>>,
    {
      transaction: {
        ...baseTransaction,
        fill: { ...baseTransaction.fill, fillType, ...extra },
      },
    },
  );

describe('Info & Display Flow', () => {
  it('trader browses tooltips for leverage, margin, fees, and liquidation price, reads content, and dismisses', async () => {
    // Step 1: Open leverage tooltip — title, explanation text, and "Got it" button
    renderPerpsTooltipView({ contentKey: 'leverage' });
    expect(
      await screen.findByText(strings('perps.tooltips.leverage.title')),
    ).toBeOnTheScreen();
    const gotItButton = screen.getByText(
      strings('perps.tooltips.got_it_button'),
    );
    expect(gotItButton).toBeOnTheScreen();
    fireEvent.press(gotItButton);

    // Step 2: Switch to margin tooltip — different title
    cleanup();
    renderPerpsTooltipView({ contentKey: 'margin' });
    expect(
      await screen.findByText(strings('perps.tooltips.margin.title')),
    ).toBeOnTheScreen();

    // Step 3: Switch to fees tooltip — title and "Got it" button present
    cleanup();
    renderPerpsTooltipView({ contentKey: 'fees' });
    expect(
      await screen.findByText(strings('perps.tooltips.fees.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.tooltips.got_it_button')),
    ).toBeOnTheScreen();

    // Step 4: Switch to liquidation price tooltip — title present
    cleanup();
    renderPerpsTooltipView({ contentKey: 'liquidation_price' });
    expect(
      await screen.findByText(
        strings('perps.tooltips.liquidation_price.title'),
      ),
    ).toBeOnTheScreen();
  });

  it('trader identifies market badges for all asset classes and fill type indicators on past transactions', async () => {
    // Step 1: Render badges for each asset type and verify correct labels
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

    // Step 2: Custom label overrides default badge text
    cleanup();
    renderBadge('crypto', 'CUSTOM');
    expect(await screen.findByText('CUSTOM')).toBeOnTheScreen();

    // Step 3: Standard fill type — no tag visible
    cleanup();
    renderFillTag(FillType.Standard);
    expect(
      screen.queryByText(strings('perps.transactions.order.take_profit')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.transactions.order.stop_loss')),
    ).not.toBeOnTheScreen();

    // Step 4: TakeProfit fill type — "Take profit" tag visible
    cleanup();
    renderFillTag(FillType.TakeProfit);
    expect(
      await screen.findByText(strings('perps.transactions.order.take_profit')),
    ).toBeOnTheScreen();

    // Step 5: StopLoss fill type — "Stop loss" tag visible
    cleanup();
    renderFillTag(FillType.StopLoss);
    expect(
      await screen.findByText(strings('perps.transactions.order.stop_loss')),
    ).toBeOnTheScreen();

    // Step 6: AutoDeleveraging fill type — "Auto-deleveraging" tag visible
    cleanup();
    renderFillTag(FillType.AutoDeleveraging);
    expect(
      await screen.findByText(
        strings('perps.transactions.order.auto_deleveraging'),
      ),
    ).toBeOnTheScreen();
  });
});
