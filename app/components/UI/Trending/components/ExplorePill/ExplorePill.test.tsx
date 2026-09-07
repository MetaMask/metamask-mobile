import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import ExplorePill from './ExplorePill';

describe('ExplorePill', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ExplorePill
        onPress={onPress}
        testID="explore-pill-test"
        leading={<Text testID="leading">L</Text>}
        title="SYMBOL"
      />,
    );

    fireEvent.press(getByTestId('explore-pill-test'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders title and optional change label when non-empty', () => {
    const { getByText, queryByText } = render(
      <ExplorePill
        onPress={jest.fn()}
        testID="pill"
        leading={<Text>L</Text>}
        title="BTC"
        changeLabel="+1.00%"
        changeTextColor={TextColor.SuccessDefault}
      />,
    );

    expect(getByText('BTC')).toBeTruthy();
    expect(getByText('+1.00%')).toBeTruthy();
  });

  it('renders two-row market details with a title accessory and interval', () => {
    const { getByText } = render(
      <ExplorePill
        onPress={jest.fn()}
        testID="market-pill"
        leading={<Text>L</Text>}
        title="BTC"
        titleEndAccessory={<Text>40x</Text>}
        valueLabel="$50,000"
        changeLabel="+1.00%"
        changeIntervalLabel="24h"
      />,
    );

    expect(getByText('BTC')).toBeTruthy();
    expect(getByText('40x')).toBeTruthy();
    expect(getByText('$50,000')).toBeTruthy();
    expect(getByText('+1.00%')).toBeTruthy();
    expect(getByText('24h')).toBeTruthy();
  });

  it('does not render change line when changeLabel is undefined or empty', () => {
    const { queryByText, rerender, getByText } = render(
      <ExplorePill
        onPress={jest.fn()}
        testID="pill"
        leading={<Text>L</Text>}
        title="ONLY"
      />,
    );
    expect(getByText('ONLY')).toBeTruthy();
    expect(queryByText('+1.00%')).toBeNull();

    rerender(
      <ExplorePill
        onPress={jest.fn()}
        testID="pill"
        leading={<Text>L</Text>}
        title="ONLY"
        changeLabel=""
      />,
    );
    expect(queryByText('+1.00%')).toBeNull();
  });
});
