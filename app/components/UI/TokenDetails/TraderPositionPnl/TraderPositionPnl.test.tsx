import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import TraderPositionPnl from './TraderPositionPnl';

const defaultPnl = {
  amount: '+$15.01',
  percentage: '+16.99%',
  isProfit: true,
};

describe('TraderPositionPnl', () => {
  it('renders the position value and unrealized PnL', () => {
    const { getByTestId } = render(
      <TraderPositionPnl positionValue="$103.31" pnl={defaultPnl} />,
    );

    expect(
      getByTestId('token-details-trader-position-pnl-value'),
    ).toHaveTextContent('$103.31');
    expect(
      getByTestId('token-details-trader-position-pnl-unrealized-pnl-value'),
    ).toHaveTextContent('+$15.01 (+16.99%)');
  });

  it('keeps the header text accessible and labels the expand control', () => {
    const { getByTestId } = render(
      <TraderPositionPnl
        positionValue="$103.31"
        pnl={defaultPnl}
        onToggleExpanded={jest.fn()}
      />,
    );

    expect(
      getByTestId('token-details-trader-position-pnl').props.accessibilityLabel,
    ).toBeUndefined();
    expect(
      getByTestId('token-details-trader-position-pnl-toggle').props
        .accessibilityLabel,
    ).toEqual(expect.any(String));
    expect(
      getByTestId('token-details-trader-position-pnl-toggle').props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ expanded: false }));
  });

  it('renders only the position value when PnL is unavailable', () => {
    const { getByTestId, queryByTestId } = render(
      <TraderPositionPnl positionValue="$103.31" />,
    );

    expect(
      getByTestId('token-details-trader-position-pnl-value'),
    ).toBeOnTheScreen();
    expect(
      queryByTestId('token-details-trader-position-pnl-unrealized-pnl'),
    ).not.toBeOnTheScreen();
  });

  it('renders a loading skeleton without a position value', () => {
    const { getByTestId, queryByTestId } = render(
      <TraderPositionPnl isLoading />,
    );

    expect(
      getByTestId('token-details-trader-position-pnl-value-loading'),
    ).toBeOnTheScreen();
    expect(
      queryByTestId('token-details-trader-position-pnl-value'),
    ).not.toBeOnTheScreen();
  });

  it('keeps the existing values visible while refreshing', () => {
    const { getByTestId, queryByTestId } = render(
      <TraderPositionPnl positionValue="$103.31" pnl={defaultPnl} isLoading />,
    );

    expect(
      getByTestId('token-details-trader-position-pnl-value'),
    ).toBeOnTheScreen();
    expect(
      queryByTestId('token-details-trader-position-pnl-value-loading'),
    ).not.toBeOnTheScreen();
  });

  it('toggles the expanded state from the chevron', () => {
    const onToggleExpanded = jest.fn();
    const { getByTestId } = render(
      <TraderPositionPnl
        positionValue="$103.31"
        pnl={defaultPnl}
        onToggleExpanded={onToggleExpanded}
      />,
    );

    fireEvent.press(getByTestId('token-details-trader-position-pnl-toggle'));

    expect(onToggleExpanded).toHaveBeenCalledWith(true);
    expect(
      within(getByTestId('token-details-trader-position-pnl')).getByTestId(
        'token-details-trader-position-pnl-toggle',
      ),
    ).toBeOnTheScreen();
  });

  it('uses the error color for negative PnL', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <TraderPositionPnl
        positionValue="$65.01"
        pnl={{
          amount: '-$15.01',
          percentage: '-16.99%',
          isProfit: false,
        }}
      />,
    );

    const pnlValue = getByTestId(
      'token-details-trader-position-pnl-unrealized-pnl-value',
    );
    const pnlValueText = UNSAFE_getAllByType(Text).find(
      (textElement) =>
        textElement.props.testID ===
        'token-details-trader-position-pnl-unrealized-pnl-value',
    );

    expect(pnlValue).toHaveTextContent('-$15.01 (-16.99%)');
    expect(pnlValueText?.props.color).toBe(TextColor.ErrorDefault);
  });
});
