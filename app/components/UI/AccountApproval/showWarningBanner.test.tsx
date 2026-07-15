import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ShowWarningBanner from './showWarningBanner';
import { CONNECTING_TO_A_DECEPTIVE_SITE } from '../../../constants/urls';

jest.mock('../../../util/analytics/externalLinkTracking', () => ({
  ...jest.requireActual('../../../util/analytics/externalLinkTracking'),
  trackExternalLinkClicked: jest.fn(),
}));
import { trackExternalLinkClicked } from '../../../util/analytics/externalLinkTracking';
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

describe('ShowWarningBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks EXTERNAL_LINK_CLICKED when Learn more is pressed', () => {
    const { getByText } = renderWithProvider(<ShowWarningBanner />);

    fireEvent.press(getByText('Learn more'));

    expect(jest.mocked(trackExternalLinkClicked)).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        location: 'dapp_connection_request',
        text: 'Learn More',
        url_domain: CONNECTING_TO_A_DECEPTIVE_SITE,
      },
    );
  });

  it('opens CONNECTING_TO_A_DECEPTIVE_SITE URL when Learn more is pressed', () => {
    const { getByText } = renderWithProvider(<ShowWarningBanner />);

    fireEvent.press(getByText('Learn more'));

    expect(Linking.openURL).toHaveBeenCalledWith(
      CONNECTING_TO_A_DECEPTIVE_SITE,
    );
  });
});
