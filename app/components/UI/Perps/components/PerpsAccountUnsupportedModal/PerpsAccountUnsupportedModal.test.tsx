import React from 'react';
import { Modal } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';
import PerpsAccountUnsupportedModal, {
  PERPS_ACCOUNT_UNSUPPORTED_MODAL_GESTURE_ROOT_TEST_ID,
} from './PerpsAccountUnsupportedModal';

jest.mock('../PerpsBottomSheetTooltip', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPerpsBottomSheetTooltip() {
    return <View testID="account-unsupported-tooltip" />;
  };
});

describe('PerpsAccountUnsupportedModal', () => {
  it('does not render when hidden', () => {
    render(
      <PerpsAccountUnsupportedModal isVisible={false} onClose={jest.fn()} />,
    );

    expect(
      screen.queryByTestId(
        PERPS_ACCOUNT_UNSUPPORTED_MODAL_GESTURE_ROOT_TEST_ID,
      ),
    ).not.toBeOnTheScreen();
  });

  it('renders the tooltip inside the modal gesture root', () => {
    render(<PerpsAccountUnsupportedModal isVisible onClose={jest.fn()} />);

    const gestureRoot = screen.getByTestId(
      PERPS_ACCOUNT_UNSUPPORTED_MODAL_GESTURE_ROOT_TEST_ID,
    );
    expect(
      within(gestureRoot).getByTestId('account-unsupported-tooltip'),
    ).toBeOnTheScreen();
  });

  it('forwards Android back requests to the close handler', () => {
    const onClose = jest.fn();
    const { UNSAFE_getByType } = render(
      <PerpsAccountUnsupportedModal isVisible onClose={onClose} />,
    );

    UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
