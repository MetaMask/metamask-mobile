import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { escapeRegExp } from 'lodash';
import { strings } from '../../../../../../../locales/i18n';
import PerpsCloseTotals from './PerpsCloseTotals';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';

describe('PerpsCloseTotals', () => {
  const label = escapeRegExp(strings('perps.close_position.included_pnl'));

  it('exposes Included P&L as one accessible label/value group', () => {
    render(
      <PerpsCloseTotals pnl={-1.5} roePercentage={-10} receiveAmount={13.5} />,
    );

    const row = screen.getByTestId(
      PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL_ROW,
    );

    expect(row).toHaveProp('accessible', true);
    expect(row).toHaveTextContent(
      new RegExp(`^${label}-\\$[\\d.]+ \\(-10[\\d.]*%\\)$`),
    );
    expect(row).not.toHaveTextContent(/\[missing/iu);
  });

  it('omits the percentage from the group when RoE is unavailable', () => {
    render(<PerpsCloseTotals pnl={2} receiveAmount={17} />);

    const row = screen.getByTestId(
      PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL_ROW,
    );

    expect(row).toHaveTextContent(new RegExp(`^${label}\\+\\$[\\d.]+$`));
    expect(row).not.toHaveTextContent(/\[missing/iu);
  });

  it('never renders a Margin row for an isolated position', () => {
    render(
      <PerpsCloseTotals pnl={2} receiveAmount={17} marginMode="isolated" />,
    );

    expect(
      screen.queryByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_MODE_TAG,
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_VALUE),
    ).toHaveTextContent('$17');
    expect(
      screen.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL_ROW,
      ),
    ).toHaveTextContent(new RegExp(`^${label}`));
  });

  it('never renders a Margin row for a cross position', () => {
    render(<PerpsCloseTotals pnl={2} receiveAmount={17} marginMode="cross" />);

    expect(
      screen.queryByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
      ),
    ).not.toBeOnTheScreen();
    // Cross margin never holds the P&L, so the row does not say it is included.
    expect(
      screen.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL_ROW,
      ),
    ).toHaveTextContent(
      new RegExp(`^${escapeRegExp(strings('perps.close_position.pnl'))}`),
    );
  });

  it('shows the cross margin with its mode tag when showMargin is set', () => {
    render(
      <PerpsCloseTotals
        pnl={2}
        receiveAmount={17}
        margin={15}
        marginMode="cross"
        showMargin
      />,
    );

    expect(
      screen.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
      ),
    ).toHaveTextContent('$15');
    expect(
      screen.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_MODE_TAG,
      ),
    ).toHaveTextContent(strings('perps.margin_mode.cross_title'));
  });

  it('omits the margin row when showMargin is set without a margin mode', () => {
    render(
      <PerpsCloseTotals pnl={2} receiveAmount={17} margin={15} showMargin />,
    );

    expect(
      screen.queryByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
      ),
    ).not.toBeOnTheScreen();
  });
});
