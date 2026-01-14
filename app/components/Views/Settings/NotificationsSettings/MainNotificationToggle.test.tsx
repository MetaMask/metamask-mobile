import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import AppConstants from '../../../../core/AppConstants';
import {
  MAIN_NOTIFICATION_TOGGLE_LEARN_MORE_TEST_ID,
  MAIN_NOTIFICATION_TOGGLE_TEST_ID,
  MainNotificationToggle,
} from './MainNotificationToggle';
// eslint-disable-next-line import/no-namespace
import * as MainNotificationToggleHookModule from './MainNotificationToggle.hooks';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

const arrangeToggleHook = () => {
  const mockOnToggle = jest.fn();
  const mockUseMainNotificationToggle = jest
    .spyOn(MainNotificationToggleHookModule, 'useMainNotificationToggle')
    .mockReturnValue({
      onToggle: mockOnToggle,
      value: true,
    });

  return {
    mockOnToggle,
    mockUseMainNotificationToggle,
  };
};

describe('MainNotificationToggle', () => {
  const arrangeMocks = () => {
    const mockOpenURL = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(jest.fn());

    return {
      ...arrangeToggleHook(),
      mockOpenURL,
    };
  };

  it('renders correctly', () => {
    arrangeMocks();
    const { getByTestId } = render(<MainNotificationToggle />);
    expect(getByTestId(MAIN_NOTIFICATION_TOGGLE_TEST_ID)).toBeTruthy();
  });

  it('toggles notifications', async () => {
    const mocks = arrangeMocks();
    const { getByTestId } = render(<MainNotificationToggle />);
    const toggleSwitch = getByTestId(
      NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE,
    );

    fireEvent(toggleSwitch, 'onChange', { nativeEvent: { value: false } });

    await waitFor(() => {
      expect(mocks.mockOnToggle).toHaveBeenCalled();
    });
  });

  it('opens learn more link', async () => {
    const mocks = arrangeMocks();
    const { getByTestId } = render(<MainNotificationToggle />);
    const learnMoreText = getByTestId(
      MAIN_NOTIFICATION_TOGGLE_LEARN_MORE_TEST_ID,
    );

    fireEvent.press(learnMoreText);

    await waitFor(() => {
      expect(mocks.mockOpenURL).toHaveBeenCalledWith(
        AppConstants.URLS.PROFILE_SYNC,
      );
    });
  });
});
