import React, { useEffect } from 'react';
import { View } from 'react-native';
import { fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ErrorBoundary from './';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { strings } from '../../../../locales/i18n';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = MetricsEventBuilder.createEventBuilder;

jest.mock('../../../components/hooks/useMetrics', () => ({
  ...jest.requireActual('../../../components/hooks/useMetrics'),
  withMetricsAwareness: jest
    .fn()
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation((Children) => (props: any) => (
      <Children
        {...props}
        metrics={{
          trackEvent: mockTrackEvent,
          createEventBuilder: mockCreateEventBuilder,
        }}
      />
    )),
}));

// Mock the support utility
jest.mock('../../../util/support', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const MockThrowComponent = () => {
  useEffect(() => {
    throw new Error('Test error');
  }, []);
  return <View />;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <ErrorBoundary view={'Root'}>
        <View />
      </ErrorBoundary>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks error event when error is thrown by child component', () => {
    renderWithProvider(
      <ErrorBoundary view={'Root'}>
        <MockThrowComponent />
      </ErrorBoundary>,
    );

    expect(mockTrackEvent).toHaveBeenCalled();
  });

  describe('Support Consent Modal', () => {
    it('shows support consent modal when contact support is pressed', () => {
      const { getByText } = renderWithProvider(
        <ErrorBoundary view={'Root'}>
          <MockThrowComponent />
        </ErrorBoundary>,
      );

      const contactSupportButton = getByText(strings('error_screen.contact_support'));
      fireEvent.press(contactSupportButton);

      expect(getByText(strings('support_consent.title'))).toBeTruthy();
    });

    it('consents to share information when consent button is pressed', async () => {
      const mockGetSupportUrl = require('../../../util/support').default;
      mockGetSupportUrl.mockResolvedValue('https://support.metamask.io');

      const { getByText } = renderWithProvider(
        <ErrorBoundary view={'Root'}>
          <MockThrowComponent />
        </ErrorBoundary>,
      );

      // Trigger the modal
      const contactSupportButton = getByText(strings('error_screen.contact_support'));
      fireEvent.press(contactSupportButton);

      // Press consent button
      const consentButton = getByText(strings('support_consent.consent'));
      await act(async () => {
        fireEvent.press(consentButton);
      });

      expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    });

    it('declines to share information when decline button is pressed', async () => {
      const mockGetSupportUrl = require('../../../util/support').default;
      mockGetSupportUrl.mockResolvedValue('https://support.metamask.io');

      const { getByText } = renderWithProvider(
        <ErrorBoundary view={'Root'}>
          <MockThrowComponent />
        </ErrorBoundary>,
      );

      // Trigger the modal
      const contactSupportButton = getByText(strings('error_screen.contact_support'));
      fireEvent.press(contactSupportButton);

      // Press decline button
      const declineButton = getByText(strings('support_consent.decline'));
      await act(async () => {
        fireEvent.press(declineButton);
      });

      expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    });

    it('falls back to base URL when consent request fails', async () => {
      const mockGetSupportUrl = require('../../../util/support').default;
      mockGetSupportUrl.mockRejectedValueOnce(new Error('Network error'));
      mockGetSupportUrl.mockResolvedValueOnce('https://support.metamask.io');

      const { getByText } = renderWithProvider(
        <ErrorBoundary view={'Root'}>
          <MockThrowComponent />
        </ErrorBoundary>,
      );

      // Trigger the modal
      const contactSupportButton = getByText(strings('error_screen.contact_support'));
      fireEvent.press(contactSupportButton);

      // Press consent button and wait for fallback
      const consentButton = getByText(strings('support_consent.consent'));
      await act(async () => {
        fireEvent.press(consentButton);
      });

      // Verify getSupportUrl was called twice (once with true, once with false for fallback)
      expect(mockGetSupportUrl).toHaveBeenCalledTimes(2);
      expect(mockGetSupportUrl).toHaveBeenNthCalledWith(1, true);
      expect(mockGetSupportUrl).toHaveBeenNthCalledWith(2, false);
    });
  });
});
