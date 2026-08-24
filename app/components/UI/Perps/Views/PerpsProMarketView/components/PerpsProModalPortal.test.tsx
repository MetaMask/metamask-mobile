import React from 'react';
import { Modal, Platform, Text, View } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

  // TAT-3758: Android gives this Modal its own window, so the root
  // SafeAreaProvider reports a bottom inset of 0 here and BottomSheetDialog's
  // bottom padding collapses, leaving sheet footers under the navigation bar.
  // Every Pro sheet (order form, positions panel, geo-block tooltip) renders
  // through this portal, so the nested provider belongs here.
  describe('modal safe-area inset (TAT-3758)', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('nests a SafeAreaProvider on Android so children measure this modal window', () => {
      Platform.OS = 'android';

      const { UNSAFE_getAllByType } = render(
        <PerpsProModalPortal>
          <View testID="modal-content" />
        </PerpsProModalPortal>,
      );

      expect(UNSAFE_getAllByType(SafeAreaProvider).length).toBe(1);
      expect(screen.getByTestId('modal-content')).toBeOnTheScreen();
    });

    it('does not nest a SafeAreaProvider on iOS, where the root provider is already correct', () => {
      Platform.OS = 'ios';

      const { UNSAFE_queryAllByType } = render(
        <PerpsProModalPortal>
          <View testID="modal-content" />
        </PerpsProModalPortal>,
      );

      expect(UNSAFE_queryAllByType(SafeAreaProvider).length).toBe(0);
      expect(screen.getByTestId('modal-content')).toBeOnTheScreen();
    });

    it('keeps the gesture root filling the provider so sheet layout is unchanged', () => {
      Platform.OS = 'android';

      render(
        <PerpsProModalPortal>
          <Text>sheet</Text>
        </PerpsProModalPortal>,
      );

      const gestureRoot = screen.getByTestId(
        PERPS_PRO_MODAL_GESTURE_ROOT_TEST_ID,
      );

      expect(gestureRoot).toHaveStyle({ flex: 1 });
      expect(within(gestureRoot).getByText('sheet')).toBeOnTheScreen();
    });
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
