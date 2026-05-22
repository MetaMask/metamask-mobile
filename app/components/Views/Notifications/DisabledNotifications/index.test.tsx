import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { NotificationsViewSelectorsIDs } from '../NotificationsView.testIds';
import DisabledNotifications from './';

describe('DisabledNotifications', () => {
  it('renders the disabled prompt and handles the CTA', () => {
    const onEnableNotifications = jest.fn();
    const { getByText, getByTestId } = renderWithProvider(
      <DisabledNotifications onEnableNotifications={onEnableNotifications} />,
    );

    expect(
      getByTestId(
        NotificationsViewSelectorsIDs.DISABLED_NOTIFICATIONS_CONTAINER,
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('notifications.disabled.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('notifications.disabled.message')),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(NotificationsViewSelectorsIDs.ENABLE_NOTIFICATIONS_BUTTON),
    );

    expect(onEnableNotifications).toHaveBeenCalledTimes(1);
  });

  it('uses the disabled prompt spacing', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <DisabledNotifications onEnableNotifications={jest.fn()} />,
    );

    const iconStyle = StyleSheet.flatten(
      getByTestId(NotificationsViewSelectorsIDs.DISABLED_NOTIFICATIONS_ICON)
        .props.style,
    );
    const titleStyle = StyleSheet.flatten(
      getByText(strings('notifications.disabled.title')).props.style,
    );
    const messageStyle = StyleSheet.flatten(
      getByText(strings('notifications.disabled.message')).props.style,
    );
    const buttonStyle = StyleSheet.flatten(
      getByTestId(NotificationsViewSelectorsIDs.ENABLE_NOTIFICATIONS_BUTTON)
        .props.style,
    );

    expect(iconStyle.marginBottom).toBe(16);
    expect(titleStyle.marginBottom).toBe(4);
    expect(messageStyle.marginBottom).toBe(16);
    expect(buttonStyle.marginTop).toBeUndefined();
  });
});
