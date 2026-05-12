import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import SettingsNotification from './';

describe('SettingsNotification', () => {
  it('renders children in warning variant', () => {
    const { getByTestId } = render(
      <SettingsNotification isWarning>
        <Text testID="settings-notification-label">this is a warning</Text>
      </SettingsNotification>,
    );

    expect(getByTestId('settings-notification-label').props.children).toBe(
      'this is a warning',
    );
  });

  it('renders children in notification variant', () => {
    const { getByTestId } = render(
      <SettingsNotification isWarning isNotification>
        <Text testID="settings-notification-label">this is a notification</Text>
      </SettingsNotification>,
    );

    expect(getByTestId('settings-notification-label').props.children).toBe(
      'this is a notification',
    );
  });
});
