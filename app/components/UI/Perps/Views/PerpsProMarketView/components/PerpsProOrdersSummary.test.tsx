import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProOrdersSummary from './PerpsProOrdersSummary';

describe('PerpsProOrdersSummary', () => {
  it('renders the open order count', () => {
    render(<PerpsProOrdersSummary orderCount={3} />);

    expect(
      screen.getByText(
        strings('perps.pro_positions_panel.open_orders', { count: 3 }),
      ),
    ).toBeOnTheScreen();
  });

  it('labels the cancel control for the whole book when unfiltered', () => {
    render(<PerpsProOrdersSummary orderCount={3} />);

    expect(
      screen.getByText(strings('perps.pro_positions_panel.cancel_all')),
    ).toBeOnTheScreen();
  });

  it('narrows the count to the orders left after filtering', () => {
    render(<PerpsProOrdersSummary orderCount={2} />);

    expect(
      screen.getByText(
        strings('perps.pro_positions_panel.open_orders', { count: 2 }),
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the cancel label unchanged when the list is filtered', () => {
    render(<PerpsProOrdersSummary orderCount={2} />);

    expect(
      screen.getByText(strings('perps.pro_positions_panel.cancel_all')),
    ).toBeOnTheScreen();
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
