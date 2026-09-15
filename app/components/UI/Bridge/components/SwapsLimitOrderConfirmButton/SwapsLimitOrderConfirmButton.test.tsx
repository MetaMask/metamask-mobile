import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { BigNumber } from 'ethers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import { SwapsLimitOrderConfirmButton } from './index';

const TEST_ID = BridgeViewSelectorsIDs.CONFIRM_BUTTON;
const DEFAULT_LABEL = 'Create Order';

jest.mock('../../hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

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
    jest.mocked(useIsInsufficientBalance).mockReturnValue(false);
  });

  it('calls onPress when pressed', () => {
    const { onPress, getByTestId } = renderButton();

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the provided label and stays enabled when the source balance covers the amount', () => {
    const { getByTestId } = renderButton({ label: 'Place order' });

    expect(getByTestId(TEST_ID)).toHaveTextContent('Place order');
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBeFalsy();
  });

  it('does not call onPress when disabled by the caller', () => {
    const { onPress, getByTestId } = renderButton({ disabled: true });

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const { onPress, getByTestId } = renderButton({ loading: true });

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('disables the button when the source balance is too low', () => {
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

    const { onPress, getByTestId } = renderButton();
    fireEvent.press(getByTestId(TEST_ID));

    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps the caller label when the source balance is too low', () => {
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

    const { getByTestId } = renderButton();

    expect(getByTestId(TEST_ID)).toHaveTextContent(DEFAULT_LABEL);
  });

  it('checks the balance against the atomic balance passed by the caller', () => {
    const atomicBalance = BigNumber.from('1000000000000000000');

    renderButton({
      latestSourceBalance: { atomicBalance, displayBalance: '1.0' },
    });

    expect(useIsInsufficientBalance).toHaveBeenCalledWith(
      expect.objectContaining({ latestAtomicBalance: atomicBalance }),
    );
  });
});
