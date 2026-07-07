import React from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { colors } from '../../../../styles/common';
import SimpleNotification from './index';
import renderWithProvider from '../../../../util/test/renderWithProvider';

jest.mock('react-native-elevated-view', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return ({ children, style }) =>
    ReactMock.createElement(
      View,
      { testID: 'simple-notification-elevated-view', style },
      children,
    );
});

const SimpleNotificationHarness = (props) => {
  const notificationAnimated = useSharedValue(0);

  return (
    <SimpleNotification
      {...props}
      notificationAnimated={notificationAnimated}
    />
  );
};

describe('SimpleNotification', () => {
  it('renders a simple notification without legacy importedColors', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <SimpleNotificationHarness
        isInBrowserView={false}
        hideCurrentNotification={jest.fn()}
        currentNotification={{
          status: 'simple_notification',
          title: 'Token added',
          description: 'USDC has been added to your wallet.',
        }}
      />,
    );

    const elevatedView = getByTestId('simple-notification-elevated-view');

    expect(elevatedView.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: colors.transparent,
      }),
    );
    expect(getByText('Token added')).toBeTruthy();
    expect(getByText('USDC has been added to your wallet.')).toBeTruthy();
  });
});
