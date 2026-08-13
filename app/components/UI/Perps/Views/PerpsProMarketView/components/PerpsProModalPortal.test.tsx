import React from 'react';
import { Modal, View } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';
import PerpsProModalPortal, {
  PERPS_PRO_MODAL_GESTURE_ROOT_TEST_ID,
} from './PerpsProModalPortal';

describe('PerpsProModalPortal', () => {
  it('renders modal content inside a full-height gesture root', () => {
    render(
      <PerpsProModalPortal>
        <View testID="modal-content" />
      </PerpsProModalPortal>,
    );

    const gestureRoot = screen.getByTestId(
      PERPS_PRO_MODAL_GESTURE_ROOT_TEST_ID,
    );

    expect(gestureRoot).toHaveStyle({ flex: 1 });
    expect(within(gestureRoot).getByTestId('modal-content')).toBeOnTheScreen();
  });

  it('forwards Android back requests', () => {
    const onRequestClose = jest.fn();
    const { UNSAFE_getByType } = render(
      <PerpsProModalPortal onRequestClose={onRequestClose}>
        <View />
      </PerpsProModalPortal>,
    );

    UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('uses the requested modal animation', () => {
    const { UNSAFE_getByType } = render(
      <PerpsProModalPortal animationType="fade">
        <View />
      </PerpsProModalPortal>,
    );

    expect(UNSAFE_getByType(Modal).props.animationType).toBe('fade');
  });
});
