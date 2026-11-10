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

  it('omits the margin row when no margin mode is given', () => {
    render(<PerpsCloseTotals pnl={2} receiveAmount={17} margin={15} />);

    expect(
      screen.queryByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
      ),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['cross', 'perps.margin_mode.cross_title'],
    ['isolated', 'perps.margin_mode.isolated_title'],
  ] as const)('shows the %s margin with its mode tag', (marginMode, tagKey) => {
    render(
      <PerpsCloseTotals
        pnl={2}
        receiveAmount={17}
        margin={15}
        marginMode={marginMode}
      />,
    );

    expect(
      screen.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_MODE_TAG,
      ),
    ).toHaveTextContent(strings(tagKey));
    expect(
      screen.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
      ),
    ).toHaveTextContent('$15');
  });
});
