import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import TraderPositionPnlDetails from './TraderPositionPnlDetails';

const details = {
  averageCost: '$0.0357',
  realizedPnl: '+$8.42',
  unrealizedPnl: '+$15.03',
  holdTime: '12 days',
};

describe('TraderPositionPnlDetails', () => {
  it('renders the expanded position details and share action', () => {
    const onShare = jest.fn();
    const { getByText, getByTestId } = render(
      <TraderPositionPnlDetails {...details} onShare={onShare} />,
    );

    expect(getByText('Share to feed')).toBeOnTheScreen();
    expect(getByText('Average cost')).toBeOnTheScreen();
    expect(getByText('Realized P&L')).toBeOnTheScreen();
    expect(getByText('Unrealized P&L')).toBeOnTheScreen();
    expect(getByText('Hold time')).toBeOnTheScreen();
    expect(getByText('$0.0357')).toBeOnTheScreen();
    expect(getByText('+$8.42')).toBeOnTheScreen();
    expect(getByText('+$15.03')).toBeOnTheScreen();
    expect(getByText('12 days')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId('token-details-trader-position-pnl-expanded-details-share'),
    );

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('uses the error color for negative PnL values', () => {
    const { UNSAFE_getAllByType } = render(
      <TraderPositionPnlDetails
        {...details}
        realizedPnl="-$8.42"
        unrealizedPnl="-$15.03"
      />,
    );

    const pnlValues = UNSAFE_getAllByType(Text).filter(({ props }) =>
      [
        'token-details-trader-position-pnl-expanded-details-realized-pnl-value',
        'token-details-trader-position-pnl-expanded-details-unrealized-pnl-value',
      ].includes(props.testID),
    );

    expect(pnlValues).toHaveLength(2);
    pnlValues.forEach((pnlValue) => {
      expect(pnlValue.props.color).toBe(TextColor.ErrorDefault);
    });
  });
});
