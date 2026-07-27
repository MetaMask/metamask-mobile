import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import {
  MAIN_NOTIFICATION_TOGGLE_TEST_ID,
  MainNotificationToggle,
} from './MainNotificationToggle';
// eslint-disable-next-line import-x/no-namespace
import * as MainNotificationToggleHookModule from './MainNotificationToggle.hooks';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

const arrangeToggleHook = () => {
  const mockOnToggle = jest.fn();
  const mockUseMainNotificationToggle = jest
    .spyOn(MainNotificationToggleHookModule, 'useMainNotificationToggle')
    .mockReturnValue({
      onToggle: mockOnToggle,
      value: true,
      isUpdating: false,
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

    fireEvent(toggleSwitch, 'onValueChange', false);

    await waitFor(() => {
      expect(mocks.mockOnToggle).toHaveBeenCalledWith(false);
    });
  });

  it('disables the switch while updating', () => {
    arrangeMocks().mockUseMainNotificationToggle.mockReturnValue({
      onToggle: jest.fn(),
      value: true,
      isUpdating: true,
    });
    const { getByTestId } = render(<MainNotificationToggle />);

    expect(
      getByTestId(NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE),
    ).toHaveProp('disabled', true);
  });
});
