import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { FeatureAnnouncementToggle } from './FeatureAnnouncementToggle';
// eslint-disable-next-line import/no-namespace
import * as UseSwitchNotificationsModule from '../../../../util/notifications/hooks/useSwitchNotifications';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

const arrangeMockMetrics = () => {
  const mockTrackEvent = jest.fn();
  const mockAddProperties = jest.fn();
  const mockCreateEventBuilder = jest.fn().mockReturnValue({
    addProperties: mockAddProperties.mockReturnThis(),
    build: jest.fn().mockReturnThis(),
  });

  return {
    mockTrackEvent,
    mockAddProperties,
    mockCreateEventBuilder,
  };
};

describe('FeatureAnnouncementToggle', () => {
  const arrangeMocks = () => {
    const mockSwitchFeatureAnnouncements = jest.fn();
    const mockUseFeatureAnnouncementToggle = jest
      .spyOn(UseSwitchNotificationsModule, 'useFeatureAnnouncementToggle')
      .mockReturnValue({
        data: true,
        switchFeatureAnnouncements: mockSwitchFeatureAnnouncements,
      });

    return {
      mockSwitchFeatureAnnouncements,
      mockUseFeatureAnnouncementToggle,
      ...arrangeMockMetrics(),
    };
  };

  it('renders correctly', () => {
    arrangeMocks();
    render(<FeatureAnnouncementToggle />);
    expect(
      screen.getByTestId(
        NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
      ),
    ).toBeTruthy();
  });

  it('toggles feature announcements', async () => {
    const mocks = arrangeMocks();
    render(<FeatureAnnouncementToggle />);
    const toggleSwitch = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
    );

    fireEvent(toggleSwitch, 'onChange', { nativeEvent: { value: false } });

    await waitFor(() => {
      // Assert new switch call
      expect(mocks.mockSwitchFeatureAnnouncements).toHaveBeenCalledWith(false);
    });
  });
});
