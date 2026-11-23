import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AnnualRateRow from './AnnualRateRow';

const TEST_ID = 'annual-rate';

describe('AnnualRateRow', () => {
  it('renders annual rate value', () => {
    const { getByTestId } = render(
      <AnnualRateRow
        annualRewardRate="2.6%"
        isLoading={false}
        isPrivacyModeEnabled={false}
        onPress={jest.fn()}
        testID={TEST_ID}
      />,
    );

    expect(getByTestId(`${TEST_ID}-value`)).toHaveTextContent('2.6% APR');
  });

  it('invokes press callback when annual rate is pressed', () => {
    const onPress = jest.fn();

    const { getByTestId } = render(
      <AnnualRateRow
        annualRewardRate="2.6%"
        isLoading={false}
        isPrivacyModeEnabled={false}
        onPress={onPress}
        testID={TEST_ID}
      />,
    );

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('masks annual rate value when privacy mode is enabled', () => {
    const { getByTestId } = render(
      <AnnualRateRow
        annualRewardRate="2.6%"
        isLoading={false}
        isPrivacyModeEnabled
        onPress={jest.fn()}
        testID={TEST_ID}
      />,
    );

    expect(getByTestId(`${TEST_ID}-value`)).toHaveTextContent(/•/);
    expect(getByTestId(`${TEST_ID}-value`)).not.toHaveTextContent('2.6% APR');
  });

  it('renders a loading skeleton instead of annual rate value', () => {
    const { queryByTestId } = render(
      <AnnualRateRow
        annualRewardRate="2.6%"
        isLoading
        isPrivacyModeEnabled={false}
        onPress={jest.fn()}
        testID={TEST_ID}
      />,
    );

    expect(queryByTestId(`${TEST_ID}-value`)).not.toBeOnTheScreen();
  });
});
