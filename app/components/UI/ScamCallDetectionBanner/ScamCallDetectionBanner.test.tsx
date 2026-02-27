import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  build: jest.fn().mockReturnValue({}),
});
const mockDismiss = jest.fn();

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../hooks/useCallDetection', () => ({
  useCallDetection: jest.fn(),
}));

jest.mock('../../../core/Analytics/MetaMetrics.events', () => ({
  MetaMetricsEvents: {
    SCAM_CALL_DETECTION_BANNER_SHOWN: 'SCAM_CALL_DETECTION_BANNER_SHOWN',
    SCAM_CALL_DETECTION_BANNER_DISMISSED:
      'SCAM_CALL_DETECTION_BANNER_DISMISSED',
  },
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'scam_call_detection.banner_title': 'MetaMask is not calling you',
      'scam_call_detection.banner_description':
        'If someone claims to be from MetaMask, it is a scam.',
    };
    return map[key] ?? key;
  },
}));

import ScamCallDetectionBanner from './ScamCallDetectionBanner';
import { useCallDetection } from '../../hooks/useCallDetection';

const mockUseCallDetection = useCallDetection as jest.MockedFunction<
  typeof useCallDetection
>;

describe('ScamCallDetectionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue({
      build: jest.fn().mockReturnValue({}),
    });
  });

  it('renders nothing when not on a call', () => {
    mockUseCallDetection.mockReturnValue({
      isOnCall: false,
      isDismissed: false,
      dismiss: mockDismiss,
    });

    const { toJSON } = render(<ScamCallDetectionBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when dismissed', () => {
    mockUseCallDetection.mockReturnValue({
      isOnCall: true,
      isDismissed: true,
      dismiss: mockDismiss,
    });

    const { toJSON } = render(<ScamCallDetectionBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders banner when on a call and not dismissed', () => {
    mockUseCallDetection.mockReturnValue({
      isOnCall: true,
      isDismissed: false,
      dismiss: mockDismiss,
    });

    const { getByText } = render(<ScamCallDetectionBanner />);
    expect(getByText('MetaMask is not calling you')).toBeDefined();
  });

  it('tracks show event when banner becomes visible', () => {
    mockUseCallDetection.mockReturnValue({
      isOnCall: true,
      isDismissed: false,
      dismiss: mockDismiss,
    });

    render(<ScamCallDetectionBanner />);
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks dismiss event and calls dismiss on close', () => {
    mockUseCallDetection.mockReturnValue({
      isOnCall: true,
      isDismissed: false,
      dismiss: mockDismiss,
    });

    const { getByRole } = render(<ScamCallDetectionBanner />);

    // BannerAlert renders a close button
    const closeButtons = getByRole('button');
    fireEvent.press(closeButtons);

    expect(mockDismiss).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledTimes(2); // show + dismiss
  });
});
