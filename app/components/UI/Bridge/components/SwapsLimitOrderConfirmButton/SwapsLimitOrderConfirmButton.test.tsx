import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import { SwapsLimitOrderConfirmButton } from './index';

const TEST_ID = BridgeViewSelectorsIDs.CONFIRM_BUTTON;
const DEFAULT_LABEL = 'Create Order';

function renderButton(
  props: Partial<
    React.ComponentProps<typeof SwapsLimitOrderConfirmButton>
  > = {},
) {
  const onPress = props.onPress ?? jest.fn();

  return {
    onPress,
    ...renderWithProvider(
      <SwapsLimitOrderConfirmButton
        onPress={onPress}
        label={DEFAULT_LABEL}
        testID={TEST_ID}
        {...props}
      />,
    ),
  };
}

describe('SwapsLimitOrderConfirmButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onPress when pressed', () => {
    const { onPress, getByTestId } = renderButton();

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the provided label and stays enabled by default', () => {
    const { getByTestId } = renderButton({ label: 'Place order' });

    expect(getByTestId(TEST_ID)).toHaveTextContent('Place order');
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBeFalsy();
  });

  it('does not call onPress when disabled by the caller', () => {
    const { onPress, getByTestId } = renderButton({ disabled: true });

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('disables the button when disabled by the caller', () => {
    const { getByTestId } = renderButton({ disabled: true });

    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBe(true);
  });

  it('does not call onPress when loading', () => {
    const { onPress, getByTestId } = renderButton({ loading: true });

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a loading state without disabling press handling via the loading prop', () => {
    const { getByTestId } = renderButton({ loading: true });

    expect(getByTestId(TEST_ID).props.accessibilityState?.busy).toBe(true);
  });
});
