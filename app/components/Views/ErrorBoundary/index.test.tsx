import React, { useEffect } from 'react';
import { View } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ErrorBoundary from './';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { strings } from '../../../../locales/i18n';
import { act } from '@testing-library/react-native';

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
    throw new Error('Throw');
  }, []);
  return <View />;
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(<ErrorBoundary view={'Root'} />, {});
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

      // Find and press the contact support button
      const contactSupportButton = getByText(strings('error_screen.contact_support'));
      fireEvent.press(contactSupportButton);

      // Check that the consent modal is displayed
      expect(getByText(strings('support_consent.title'))).toBeTruthy();
      expect(getByText(strings('support_consent.description'))).toBeTruthy();
      expect(getByText(strings('support_consent.consent'))).toBeTruthy();
      expect(getByText(strings('support_consent.decline'))).toBeTruthy();
    });

    it('handles consent to share information', async () => {
      const mockGetSupportUrl = require('../../../util/support').default;
      mockGetSupportUrl.mockResolvedValue('https://support.metamask.io?param=value');

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
      fireEvent.press(consentButton);

      // Verify getSupportUrl was called with consent flag
      expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    });

    it('handles decline to share information', async () => {
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
      fireEvent.press(declineButton);

      // Verify getSupportUrl was called without consent flag
      expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    });

    it('handles error in getSupportUrl gracefully', async () => {
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
        // Wait for state updates
        await Promise.resolve();
      });

      // Verify getSupportUrl was called twice (with true and then false)
      expect(mockGetSupportUrl).toHaveBeenCalledTimes(2);
      expect(mockGetSupportUrl).toHaveBeenNthCalledWith(1, true);
      expect(mockGetSupportUrl).toHaveBeenNthCalledWith(2, false);
    });
  });
});
