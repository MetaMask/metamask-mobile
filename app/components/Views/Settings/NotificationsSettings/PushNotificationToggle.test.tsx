import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as PushNotificationToggleHooksModule from './PushNotificationToggle.hooks';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  PushNotificationToggle,
  PUSH_NOTIFICATION_TOGGLE_TEST_ID,
} from './PushNotificationToggle';
import { strings } from '../../../../../locales/i18n';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

describe('PushNotificationToggle', () => {
  const arrangeMocks = () => {
    const mockOnToggle = jest.fn();
    const mockUsePushNotificationSettingsToggle = jest
      .spyOn(
        PushNotificationToggleHooksModule,
        'usePushNotificationSettingsToggle',
      )
      .mockReturnValue({
        value: false,
        loading: false,
        onToggle: mockOnToggle,
      });

    return {
      mockOnToggle,
      mockUsePushNotificationSettingsToggle,
    };
  };

  type Mocks = ReturnType<typeof arrangeMocks>;
  const arrange = (overrideMocks?: (m: Mocks) => void) => {
    const mocks = arrangeMocks();
    overrideMocks?.(mocks);

    const container = renderWithProvider(<PushNotificationToggle />);

    return { mocks, container };
  };

  it('renders toggle', () => {
    const { container } = arrange();

    // Assert Text
    expect(
      container.getByText(strings('app_settings.enable_push_notifications')),
    ).toBeTruthy();

    // Assert Toggle
    expect(
      container.getByTestId(PUSH_NOTIFICATION_TOGGLE_TEST_ID),
    ).toBeTruthy();
  });

  it('is clickable', () => {
    const { mocks, container } = arrange();

    // Assert Toggle State
    const switchElement = container.getByTestId(
      NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
    );
    expect(switchElement.props.disabled).toBe(false);

    // Act/Assert - Toggle Clicked
    fireEvent(switchElement, 'onChange', { nativeEvent: { value: true } });
    waitFor(() => expect(mocks.mockOnToggle).toHaveBeenCalled());
  });

  it('is not clickable when loading', () => {
    const { mocks, container } = arrange((m) => {
      m.mockUsePushNotificationSettingsToggle.mockReturnValue({
        loading: true, // Toggle is Loading
        value: false,
        onToggle: m.mockOnToggle,
      });
    });

    // Assert Toggle State
    const switchElement = container.getByTestId(
      NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
    );
    expect(switchElement.props.disabled).toBe(true);

    // Act/Assert - Toggle Clicked
    fireEvent(switchElement, 'valueChange', true);
    waitFor(() => expect(mocks.mockOnToggle).not.toHaveBeenCalled());
  });
});
