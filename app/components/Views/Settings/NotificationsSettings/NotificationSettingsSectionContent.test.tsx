import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { NotificationSettingsSectionContent } from './NotificationSettingsSectionContent';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { useNotificationStoragePreferences } from './hooks/useNotificationStoragePreferences';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { NotificationChannel } from '../../../../core/Analytics/events/channels';
import Logger from '../../../../util/Logger';

jest.mock('./hooks/useNotificationStoragePreferences');
jest.mock('../../../hooks/useAnalytics/useAnalytics');

const PUSH_TOGGLE =
  NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE;
const IN_APP_TOGGLE =
  NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE;

const mockUpdateSectionChannel = jest.fn();
const mockTrackEvent = jest.fn();

const arrangePreferences = ({
  hasPreferences = true,
}: { hasPreferences?: boolean } = {}) => {
  jest.mocked(useNotificationStoragePreferences).mockReturnValue({
    preferences: hasPreferences
      ? {
          walletActivity: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
            accounts: [],
          },
          marketing: {
            pushNotificationsEnabled: false,
            inAppNotificationsEnabled: false,
          },
          perps: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
          },
          socialAI: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
            txAmountLimit: 500,
            mutedTraderProfileIds: [],
          },
          agenticCli: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
          },
          priceAlerts: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
          },
        }
      : undefined,
    hasNotificationPreferences: hasPreferences,
    isLoading: false,
    isUpdatingPreferences: false,
    error: null,
    updatePreference: jest.fn(),
    updateSectionChannel: mockUpdateSectionChannel,
    updatePreferencesSection: jest.fn().mockResolvedValue(undefined),
    refetch: jest.fn(),
  });
};

const renderContent = (
  props: Partial<
    React.ComponentProps<typeof NotificationSettingsSectionContent>
  > = {},
) =>
  renderWithProvider(
    <NotificationSettingsSectionContent type="priceAlerts" {...props} />,
  );

describe('NotificationSettingsSectionContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateSectionChannel.mockResolvedValue(undefined);
    arrangePreferences();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
  });

  it('renders nothing when the section has no stored preferences', () => {
    arrangePreferences({ hasPreferences: false });

    renderContent();

    expect(screen.queryByTestId(PUSH_TOGGLE)).not.toBeOnTheScreen();
  });

  it('renders the title and description when both are provided', () => {
    renderContent({ title: 'Price alerts', description: 'Token price moves' });

    expect(screen.getByText('Price alerts')).toBeOnTheScreen();
    expect(screen.getByText('Token price moves')).toBeOnTheScreen();
  });

  it('omits the description when only a title is provided', () => {
    renderContent({ title: 'Price alerts' });

    expect(screen.getByText('Price alerts')).toBeOnTheScreen();
    expect(screen.queryByText('Token price moves')).not.toBeOnTheScreen();
  });

  it('renders both channel toggles enabled by default', () => {
    renderContent();

    expect(screen.getByTestId(PUSH_TOGGLE)).toHaveProp('disabled', undefined);
    expect(screen.getByTestId(IN_APP_TOGGLE)).toHaveProp('disabled', undefined);
  });

  it('disables both channel toggles when disabled is true', () => {
    renderContent({ disabled: true });

    expect(screen.getByTestId(PUSH_TOGGLE)).toHaveProp('disabled', true);
    expect(screen.getByTestId(IN_APP_TOGGLE)).toHaveProp('disabled', true);
  });

  it('mutes Push and In-app labels when disabled is true', () => {
    renderContent({ disabled: true });

    const labels = screen
      .UNSAFE_getAllByType(Text)
      .filter(
        (node) =>
          node.props.children ===
            strings('app_settings.notifications_opts.push_recommended') ||
          node.props.children ===
            strings('app_settings.notifications_opts.in_app'),
      );

    expect(labels).toHaveLength(2);
    labels.forEach((label) => {
      expect(label.props.color).toBe(TextColor.TextMuted);
    });
  });

  it('keeps Push and In-app labels at default color when not disabled', () => {
    renderContent();

    const labels = screen
      .UNSAFE_getAllByType(Text)
      .filter(
        (node) =>
          node.props.children ===
            strings('app_settings.notifications_opts.push_recommended') ||
          node.props.children ===
            strings('app_settings.notifications_opts.in_app'),
      );

    expect(labels).toHaveLength(2);
    labels.forEach((label) => {
      expect(label.props.color).toBe(TextColor.TextDefault);
    });
  });

  it('persists and tracks the push channel when the push toggle changes', async () => {
    renderContent();

    await act(async () => {
      fireEvent(screen.getByTestId(PUSH_TOGGLE), 'onValueChange', false);
    });

    expect(mockUpdateSectionChannel).toHaveBeenCalledWith(
      'priceAlerts',
      'pushNotificationsEnabled',
      false,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED,
      )
        .addProperties({
          settings_type: 'price_alerts',
          notification_channel: NotificationChannel.PUSH,
          enabled: false,
        })
        .build(),
    );
  });

  it('persists and tracks the in-app channel when the in-app toggle changes', async () => {
    renderContent();

    await act(async () => {
      fireEvent(screen.getByTestId(IN_APP_TOGGLE), 'onValueChange', false);
    });

    expect(mockUpdateSectionChannel).toHaveBeenCalledWith(
      'priceAlerts',
      'inAppNotificationsEnabled',
      false,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED,
      )
        .addProperties({
          settings_type: 'price_alerts',
          notification_channel: NotificationChannel.IN_APP,
          enabled: false,
        })
        .build(),
    );
  });

  it('logs an error when persisting the push channel fails', async () => {
    const mockLoggerError = jest
      .spyOn(Logger, 'error')
      .mockImplementation(jest.fn());
    mockUpdateSectionChannel.mockRejectedValue(new Error('network down'));
    renderContent();

    await act(async () => {
      fireEvent(screen.getByTestId(PUSH_TOGGLE), 'onValueChange', false);
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        channel: 'pushNotificationsEnabled',
        nextValue: false,
        type: 'priceAlerts',
      }),
    );
  });

  it('restores the push toggle value when persisting fails', async () => {
    jest.spyOn(Logger, 'error').mockImplementation(jest.fn());
    mockUpdateSectionChannel.mockRejectedValue(new Error('network down'));
    renderContent();

    await act(async () => {
      fireEvent(screen.getByTestId(PUSH_TOGGLE), 'onValueChange', false);
    });

    await waitFor(() => {
      expect(screen.getByTestId(PUSH_TOGGLE)).toHaveProp('value', true);
    });
  });

  it('logs an error when persisting the in-app channel fails', async () => {
    const mockLoggerError = jest
      .spyOn(Logger, 'error')
      .mockImplementation(jest.fn());
    mockUpdateSectionChannel.mockRejectedValue(new Error('network down'));
    renderContent();

    await act(async () => {
      fireEvent(screen.getByTestId(IN_APP_TOGGLE), 'onValueChange', false);
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        channel: 'inAppNotificationsEnabled',
        nextValue: false,
        type: 'priceAlerts',
      }),
    );
  });

  it('renders the marketing disclaimer for the marketing section', () => {
    renderContent({ type: 'marketing' });

    expect(
      screen.getByText(
        'By turning this on, you agree to receive product news and marketing updates from MetaMask.',
      ),
    ).toBeOnTheScreen();
  });

  it('renders no extra section content for a channels-only section', () => {
    renderContent();

    expect(
      screen.queryByText(
        'By turning this on, you agree to receive product news and marketing updates from MetaMask.',
      ),
    ).not.toBeOnTheScreen();
  });
});
