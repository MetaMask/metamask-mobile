import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SwapsLimitOrderConfirmButton } from './index';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';

const TEST_ID = BridgeViewSelectorsIDs.CONFIRM_BUTTON;

describe('SwapsLimitOrderConfirmButton', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();

    const { getByTestId } = renderWithProvider(
      <SwapsLimitOrderConfirmButton
        onPress={onPress}
        label="Confirm limit"
        testID={TEST_ID}
      />,
    );

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the provided label', () => {
    const { getByTestId } = renderWithProvider(
      <SwapsLimitOrderConfirmButton
        onPress={jest.fn()}
        label="Place order"
        testID={TEST_ID}
      />,
    );

    expect(getByTestId(TEST_ID)).toHaveTextContent('Place order');
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();

    const { getByTestId } = renderWithProvider(
      <SwapsLimitOrderConfirmButton
        onPress={onPress}
        label="Confirm limit"
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
      <SwapsLimitOrderConfirmButton
        onPress={onPress}
        label="Confirm limit"
        testID={TEST_ID}
        loading
      />,
    );

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });
});
