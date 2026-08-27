import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SwapsRecurringBuyConfirmButton } from './index';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';

const TEST_ID = BridgeViewSelectorsIDs.CONFIRM_BUTTON;

describe('SwapsRecurringBuyConfirmButton', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();

    const { getByTestId } = renderWithProvider(
      <SwapsRecurringBuyConfirmButton
        onPress={onPress}
        label="Confirm recurring"
        testID={TEST_ID}
      />,
    );

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the provided label', () => {
    const { getByTestId } = renderWithProvider(
      <SwapsRecurringBuyConfirmButton
        onPress={jest.fn()}
        label="Start buying"
        testID={TEST_ID}
      />,
    );

    expect(getByTestId(TEST_ID)).toHaveTextContent('Start buying');
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();

    const { getByTestId } = renderWithProvider(
      <SwapsRecurringBuyConfirmButton
        onPress={onPress}
        label="Confirm recurring"
        testID={TEST_ID}
        disabled
      />,
    );

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();

    const { getByTestId } = renderWithProvider(
      <SwapsRecurringBuyConfirmButton
        onPress={onPress}
        label="Confirm recurring"
        testID={TEST_ID}
        loading
      />,
    );

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });
});
