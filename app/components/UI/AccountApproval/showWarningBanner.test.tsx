import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ShowWarningBanner from './showWarningBanner';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { CONNECTING_TO_A_DECEPTIVE_SITE } from '../../../constants/urls';

const mockTrackEvent = jest.fn();
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    isEnabled: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('../../../util/analytics/AnalyticsEventBuilder', () => {
  const createEventBuilder = (eventName: string) => {
    const builder = {
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({ name: eventName })),
    };
    return builder;
  };
  return {
    AnalyticsEventBuilder: { createEventBuilder },
  };
});

const mockOpenURL = jest.fn();
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: (url: string) => mockOpenURL(url),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

describe('ShowWarningBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks EXTERNAL_LINK_CLICKED when Learn more is pressed', () => {
    const { getByText } = renderWithProvider(<ShowWarningBanner />);

    fireEvent.press(getByText('Learn more'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.EXTERNAL_LINK_CLICKED,
      }),
    );
  });

  it('opens CONNECTING_TO_A_DECEPTIVE_SITE URL when Learn more is pressed', () => {
    const { getByText } = renderWithProvider(<ShowWarningBanner />);

    fireEvent.press(getByText('Learn more'));

    expect(mockOpenURL).toHaveBeenCalledWith(CONNECTING_TO_A_DECEPTIVE_SITE);
  });
});
