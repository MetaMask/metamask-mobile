import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsCloseTotals from './PerpsCloseTotals';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';

describe('PerpsCloseTotals', () => {
  it('exposes Included P&L as one accessible label/value group', () => {
    render(
      <PerpsCloseTotals pnl={-1.5} roePercentage={-10} receiveAmount={13.5} />,
    );

    const row = screen.getByTestId(
      PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL_ROW,
    );

    expect(row).toHaveProp('accessible', true);
    expect(row).toHaveTextContent(/^Included P&L-\$[\d.]+ \(-10[\d.]*%\)$/);
  });

  it('omits the percentage from the group when RoE is unavailable', () => {
    render(<PerpsCloseTotals pnl={2} receiveAmount={17} />);

    const row = screen.getByTestId(
      PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL_ROW,
    );

    expect(row).toHaveTextContent(/^Included P&L\+\$[\d.]+$/);
  });
});
