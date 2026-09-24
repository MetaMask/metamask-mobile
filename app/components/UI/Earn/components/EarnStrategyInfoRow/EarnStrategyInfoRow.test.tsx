import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import EarnStrategyInfoRow from './EarnStrategyInfoRow';

describe('EarnStrategyInfoRow', () => {
  it('renders row text and custom test ID', () => {
    const { getByTestId, getByText } = render(
      <EarnStrategyInfoRow
        text="Your assets remain available for withdrawal"
        testID="strategy-info-row"
      />,
    );

    expect(getByTestId('strategy-info-row')).toBeOnTheScreen();
    expect(
      getByText('Your assets remain available for withdrawal'),
    ).toBeOnTheScreen();
  });

  it('renders the start accessory when provided', () => {
    const { getByTestId } = render(
      <EarnStrategyInfoRow
        text="Strategy details"
        startAccessory={<View testID="strategy-info-row-accessory" />}
      />,
    );

    expect(getByTestId('strategy-info-row-accessory')).toBeOnTheScreen();
  });

  it('omits the start accessory when not provided', () => {
    const { queryByTestId } = render(
      <EarnStrategyInfoRow text="Strategy details" />,
    );

    expect(queryByTestId('strategy-info-row-accessory')).not.toBeOnTheScreen();
  });
});
