/**
 * Component view tests for PerpsCloseAllPositionsView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import React, { useRef } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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

    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions },
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

    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions },
    });

    expect(
      await screen.findByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toHaveTextContent(strings('perps.tooltips.fees.fee_discount'));
    expect(
      screen.queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
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
