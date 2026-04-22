import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import RewardsUpdateRequired from './RewardsUpdateRequired';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  MM_APP_STORE_LINK,
  MM_PLAY_STORE_LINK,
} from '../../../../../constants/urls';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  build: jest.fn(() => 'built-event'),
  addProperties: jest.fn().mockReturnThis(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: string[]) => args,
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn(),
}));

describe('RewardsUpdateRequired', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, description, and update button', () => {
    render(<RewardsUpdateRequired />);

    expect(
      screen.getByTestId('rewards-update-required-title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('rewards-update-required-description'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('rewards-update-required-update-button'),
    ).toBeOnTheScreen();
  });

  it('tracks the version guard viewed event on mount', () => {
    render(<RewardsUpdateRequired />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_VERSION_GUARD_VIEWED,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('opens App Store on iOS when update button is pressed', async () => {
    Platform.OS = 'ios';
    const { getByTestId } = render(<RewardsUpdateRequired />);

    fireEvent.press(getByTestId('rewards-update-required-update-button'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_VERSION_GUARD_UPDATE_CLICKED,
    );

    await expect(Linking.canOpenURL).toHaveBeenCalledWith(MM_APP_STORE_LINK);
  });

  it('opens Play Store on Android when update button is pressed', async () => {
    Platform.OS = 'android';
    const { getByTestId } = render(<RewardsUpdateRequired />);

    fireEvent.press(getByTestId('rewards-update-required-update-button'));

    await expect(Linking.canOpenURL).toHaveBeenCalledWith(MM_PLAY_STORE_LINK);
  });
});
