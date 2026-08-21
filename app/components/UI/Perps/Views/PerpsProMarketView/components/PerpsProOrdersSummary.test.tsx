import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProOrdersSummary from './PerpsProOrdersSummary';

describe('PerpsProOrdersSummary', () => {
  it('renders the open order count and an unscoped cancel control', () => {
    render(<PerpsProOrdersSummary orderCount={3} />);

    expect(
      screen.getByText(
        strings('perps.pro_positions_panel.open_orders', { count: 3 }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.pro_positions_panel.cancel_all')),
    ).toBeOnTheScreen();
  });

  it('counts the listed orders on the cancel control when filtered', () => {
    render(<PerpsProOrdersSummary orderCount={2} isFiltered />);

    expect(
      screen.getByText(
        strings('perps.pro_positions_panel.cancel_count', { count: 2 }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.pro_positions_panel.cancel_all')),
    ).not.toBeOnTheScreen();
  });

  it('invokes the cancel-all callback when the control is pressed', () => {
    const onCancelAll = jest.fn();

    render(<PerpsProOrdersSummary orderCount={1} onCancelAll={onCancelAll} />);

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDERS_CANCEL_ALL),
    );

    expect(onCancelAll).toHaveBeenCalledTimes(1);
  });
});
