import { fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationSettingsViewSelectorsIDs } from '../../../../../e2e/selectors/Notifications/NotificationSettingsView.selectors';
import { usePerpsNotificationToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { PerpsNotificationToggle } from './PerpsNotificationToggle';
import React from 'react';

// Mock the usePerpsNotificationToggle hook
jest.mock(
  '../../../../util/notifications/hooks/useSwitchNotifications',
  () => ({
    usePerpsNotificationToggle: jest.fn(),
  }),
);

// Mock useMetrics
jest.mock('../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    NOTIFICATIONS_SETTINGS_UPDATED: 'NotificationsSettingsUpdated',
  },
  useMetrics: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    if (key === 'app_settings.notifications_opts.perps_title') {
      return 'Perps trading';
    }
    return key;
  }),
}));

// Mock notifications feature flag
jest.mock('../../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: jest.fn().mockReturnValue(true),
}));

// Mock CustomNotificationsRow component
jest.mock('./CustomNotificationsRow', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return ({
    title,
    icon,
    isEnabled,
    toggleCustomNotificationsEnabled,
    testID,
  }: {
    title: string;
    icon: string;
    isEnabled: boolean;
    toggleCustomNotificationsEnabled: () => void;
    testID?: string;
  }) =>
    ReactActual.createElement(
      RN.View,
      { testID: `${testID}--container` },
      ReactActual.createElement(RN.Text, { testID: `${testID}-title` }, title),
      ReactActual.createElement(
        RN.Text,
        { testID: `${testID}-icon` },
        `Icon: ${icon}`,
      ),
      ReactActual.createElement(
        RN.TouchableOpacity,
        {
          testID: `${testID}-switch`,
          onPress: toggleCustomNotificationsEnabled,
        },
        ReactActual.createElement(RN.Text, {}, isEnabled ? 'ON' : 'OFF'),
      ),
    );
});

describe('PerpsNotificationToggle', () => {
  const mockSwitchPerpsNotifications = jest.fn().mockResolvedValue(undefined);
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default hook mock implementations
    (usePerpsNotificationToggle as jest.Mock).mockReturnValue({
      data: false, // default to disabled
      switchPerpsNotifications: mockSwitchPerpsNotifications,
    });

    // Setup metrics mock
    const mockEventBuilder = {
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue('built-event'),
    };
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
  });

  it('should render toggle with correct props', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <PerpsNotificationToggle />,
    );

    // Check title text
    const titleElement = getByTestId(
      `${NotificationSettingsViewSelectorsIDs.PERPS_NOTIFICATIONS_TOGGLE}-title`,
    );
    expect(titleElement.props.children).toBe('Perps trading');

    // Check toggle state through text
    expect(getByText('OFF')).toBeTruthy();

    // Check container test ID
    expect(
      getByTestId(
        `${NotificationSettingsViewSelectorsIDs.PERPS_NOTIFICATIONS_TOGGLE}--container`,
      ),
    ).toBeTruthy();
  });

  it('should render toggle in enabled state when perps notifications are enabled', () => {
    // Mock enabled state
    (usePerpsNotificationToggle as jest.Mock).mockReturnValue({
      data: true,
      switchPerpsNotifications: mockSwitchPerpsNotifications,
    });

    const { getByText } = renderWithProvider(<PerpsNotificationToggle />);

    // Check toggle state through text
    expect(getByText('ON')).toBeTruthy();
  });

  it('should call switchPerpsNotifications when toggle is pressed', async () => {
    const { getByTestId } = renderWithProvider(<PerpsNotificationToggle />);

    // Find the toggle button and press it
    const toggleButton = getByTestId(
      `${NotificationSettingsViewSelectorsIDs.PERPS_NOTIFICATIONS_TOGGLE}-switch`,
    );
    fireEvent.press(toggleButton);

    // Verify switchPerpsNotifications was called with expected value
    expect(mockSwitchPerpsNotifications).toHaveBeenCalledWith(true);
  });

  it('should track metrics when toggle is pressed', async () => {
    const { getByTestId } = renderWithProvider(<PerpsNotificationToggle />);

    // Find the toggle button and press it
    const toggleButton = getByTestId(
      `${NotificationSettingsViewSelectorsIDs.PERPS_NOTIFICATIONS_TOGGLE}-switch`,
    );
    fireEvent.press(toggleButton);

    // Wait for async operations to complete
    await waitFor(() => {
      // Verify tracking event was called with correct properties
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED,
      );
      expect(mockTrackEvent).toHaveBeenCalledWith('built-event');
    });
  });
});
