/**
 * Component view tests for PerpsCloseAllPositionsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import React, { useRef } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import type { Position } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  defaultPositionForViews,
  renderPerpsCloseAllPositionsView,
  renderPerpsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { MembershipVipBadgeSelectorsIDs } from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import {
  PerpsCloseAllPositionsViewSelectorsIDs,
  PerpsFeeDiscountLabelSelectorsIDs,
} from '../../Perps.testIds';
import PerpsCloseAllPositionsView from './PerpsCloseAllPositionsView';

const positions: Position[] = [
  defaultPositionForViews,
  {
    ...defaultPositionForViews,
    symbol: 'BTC',
    size: '0.2',
    marginUsed: '800',
    entryPrice: '50000',
    liquidationPrice: '45000',
    unrealizedPnl: '-50',
    returnOnEquity: '-0.05',
    positionValue: '10000',
  },
];

/** Live prices for both positions; Core prices the close at them. */
const livePrices = {
  ETH: {
    symbol: 'ETH',
    price: '2500',
    timestamp: Date.now(),
    isTradable: true,
  },
  BTC: {
    symbol: 'BTC',
    price: '50000',
    timestamp: Date.now(),
    isTradable: true,
  },
};

const createDiscountedFeeQuote = (
  feeSource: 'grant' | 'rewards',
  notionalUsd: number,
  discountBips = 7500,
) => {
  const protocolFeeRate = 0.00045;
  const undiscountedMetamaskFeeRate = 0.001;
  const metamaskFeeRate =
    undiscountedMetamaskFeeRate * (1 - discountBips / 10000);
  const feeRate = protocolFeeRate + metamaskFeeRate;

  return {
    feeRate,
    feeAmount: notionalUsd * feeRate,
    protocolFeeRate,
    protocolFeeAmount: notionalUsd * protocolFeeRate,
    metamaskFeeRate,
    metamaskFeeAmount: notionalUsd * metamaskFeeRate,
    chargesMetamaskBuilderFee: true,
    feeSource,
    metamaskFeeDiscountBips: discountBips,
    undiscountedMetamaskFeeRate,
  };
};

describe('PerpsCloseAllPositionsView', () => {
  const calculateFees = Engine.context.PerpsController
    .calculateFees as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    calculateFees.mockReset().mockResolvedValue({});
  });

  it('confirms closing all open positions from the bulk close sheet', async () => {
    const closePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;

    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions },
    });

    expect(
      await screen.findByText(strings('perps.close_all_modal.title')),
    ).toBeOnTheScreen();
    // Literal copy rather than `strings(...)`: asserting against the same call
    // the component makes would pass even if pluralization resolved to nothing.
    expect(
      screen.getByText(
        "We'll close your 2 open positions at current market price.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_position.margin')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_position.you_receive')),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByText(
        strings('perps.close_all_modal.close_count', {
          count: positions.length,
        }),
      ),
    );

    await waitFor(() => {
      expect(closePositions).toHaveBeenCalledWith({
        symbols: positions.map((p) => p.symbol),
      });
    });
  });

  it('shows promotional pricing when grant quotes dominate the close-all fees', async () => {
    calculateFees
      .mockResolvedValueOnce(createDiscountedFeeQuote('grant', 5000))
      .mockResolvedValueOnce(createDiscountedFeeQuote('grant', 10000));

    const { stream } = renderPerpsCloseAllPositionsView({
      streamOverrides: { positions },
    });
    act(() => {
      stream.emitPrices(livePrices);
    });

    expect(
      await screen.findByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.tooltips.fees.promotional_discount')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PerpsCloseAllPositionsViewSelectorsIDs.ORIGINAL_FEES_VALUE,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('shows generic pricing when grant and rewards discounts are tied', async () => {
    calculateFees
      .mockResolvedValueOnce(createDiscountedFeeQuote('rewards', 5000))
      .mockResolvedValueOnce(createDiscountedFeeQuote('grant', 10000, 3750));

    const { stream } = renderPerpsCloseAllPositionsView({
      streamOverrides: { positions },
    });
    act(() => {
      stream.emitPrices(livePrices);
    });

    expect(
      await screen.findByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toHaveTextContent(strings('perps.tooltips.fees.fee_discount'));
    expect(
      screen.queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('shows the receive amount Core estimates for isolated and cross positions', async () => {
    // 0.145% close fee quoted for both positions
    calculateFees.mockResolvedValue({
      feeRate: 0.00145,
      feeAmount: 0,
      protocolFeeRate: 0.00045,
      protocolFeeAmount: 0,
      metamaskFeeRate: 0.001,
      metamaskFeeAmount: 0,
    });
    const isolatedLong: Position = {
      ...defaultPositionForViews,
      size: '1',
      entryPrice: '2500',
      marginUsed: '983.33',
      unrealizedPnl: '150',
      leverage: { type: 'isolated', value: 3 },
    };
    const crossShort: Position = {
      ...positions[1],
      size: '-0.2',
      entryPrice: '50000',
      marginUsed: '800',
      unrealizedPnl: '100',
      leverage: { type: 'cross', value: 12 },
    };

    const { stream } = renderPerpsCloseAllPositionsView({
      crossMarginEnabled: true,
      streamOverrides: { positions: [isolatedLong, crossShort] },
    });
    act(() => {
      stream.emitPrices({
        ETH: { ...livePrices.ETH, price: '2650' },
        BTC: { ...livePrices.BTC, price: '49500' },
      });
    });

    // Isolated long: 983.33 - 150 + (2650 - 2500) = 983.33, fee 3.8425
    // Cross short: 800 margin + (50000 - 49500) × 0.2 = 900 received, fee 14.355
    // Receive: (983.33 - 3.84) + (900 - 14.36) = 1865.13
    // With a cross position, every margin excludes its P&L:
    // (983.33 - 150) isolated + 800 cross = 1633.33, and
    // 1633.33 margin + 250 P&L - 18.20 fees = 1865.13 receive.
    expect(
      await screen.findByTestId(
        PerpsCloseAllPositionsViewSelectorsIDs.RECEIVE_VALUE,
      ),
    ).toHaveTextContent('$1,865.13');
    expect(
      screen.getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.MARGIN_VALUE),
    ).toHaveTextContent('$1,633.33');
    expect(screen.getByText('+$250')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.FEES_VALUE),
    ).toHaveTextContent('$18.20');
    // Cross margin never holds P&L, so the summary no longer says it does
    expect(
      screen.queryByText(strings('perps.close_position.includes_pnl')),
    ).not.toBeOnTheScreen();
  });

  it('shows the receive amount as unavailable until the close fee is quoted', async () => {
    calculateFees.mockReturnValue(new Promise(() => undefined));

    const { stream } = renderPerpsCloseAllPositionsView({
      streamOverrides: { positions },
    });
    act(() => {
      stream.emitPrices(livePrices);
    });

    expect(
      await screen.findByTestId(
        PerpsCloseAllPositionsViewSelectorsIDs.RECEIVE_VALUE,
      ),
    ).toHaveTextContent('--');
  });

  it('drops the count and singularises the copy for a lone position', async () => {
    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions: [positions[0]] },
    });

    expect(
      await screen.findByText(
        "We'll close your open position at current market price.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Close (1)')).toBeOnTheScreen();
  });

  it('does not expose the close action when there are no open positions', async () => {
    const closePositions = Engine.context.PerpsController
      .closePositions as jest.Mock;

    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions: [] },
    });

    expect(
      await screen.findByText(strings('perps.position.no_positions')),
    ).toBeOnTheScreen();
    // A missing key renders this fallback, which the `strings(...)` match above accepts.
    expect(
      screen.queryByText(/\[missing ".*" translation\]/),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('perps.close_all_modal.close_count', { count: 0 }),
      ),
    ).not.toBeOnTheScreen();
    expect(closePositions).not.toHaveBeenCalled();
  });

  const renderFilteredCloseAll = (filtered: Position[]) => {
    const FilteredCloseAll = () => {
      const sheetRef = useRef<BottomSheetRef | null>(null);
      return (
        <PerpsCloseAllPositionsView
          sheetRef={sheetRef}
          onClose={jest.fn()}
          positions={filtered}
          isFiltered
        />
      );
    };

    return renderPerpsView(
      FilteredCloseAll as unknown as React.ComponentType,
      Routes.PERPS.MODALS.CLOSE_ALL_POSITIONS,
      { streamOverrides: { positions } },
    );
  };

  it('names the filtered scope in the sheet title', async () => {
    renderFilteredCloseAll([positions[0]]);

    expect(
      await screen.findByText(strings('perps.close_all_modal.title_filtered')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.close_all_modal.title')),
    ).not.toBeOnTheScreen();
  });

  it('counts only the passed positions', async () => {
    renderFilteredCloseAll([positions[0]]);

    expect(
      await screen.findByText(
        strings('perps.close_all_modal.description', { count: 1 }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('perps.close_all_modal.close_count', { count: 1 }),
      ),
    ).toBeOnTheScreen();
  });
});
