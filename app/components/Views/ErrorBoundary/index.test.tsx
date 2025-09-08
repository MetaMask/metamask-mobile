import React, { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ErrorBoundary, { Fallback } from './';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import {
  captureSentryFeedback,
  captureExceptionForced,
} from '../../../util/sentry/utils';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import getSupportUrl from '../../../util/support';

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

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
}));

jest.mock('../../../util/sentry/utils', () => ({
  captureSentryFeedback: jest.fn(),
  captureExceptionForced: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockError = new Error('Throw');
const MockThrowComponent = () => {
  useEffect(() => {
    throw mockError;
  }, []);
  return <View />;
};

describe('ErrorBoundary', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    replace: jest.fn(),
  };

  const mockProps = {
    errorMessage: 'Test error message',
    showExportSeedphrase: jest.fn(),
    copyErrorToClipboard: jest.fn(),
    sentryId: 'test-sentry-id',
    onboardingErrorConfig: null,
  };

  const initialState = {
    security: {
      dataCollectionForMarketing: true,
    },
  };

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

  it('renders all buttons when dataCollectionForMarketing is true', () => {
    const { getByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    expect(getByText('Describe what happened')).toBeTruthy();
    expect(getByText('Contact support')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
  });

  it('hides Describe what happened button when dataCollectionForMarketing is false', () => {
    const stateWithoutDataCollection = {
      security: {
        dataCollectionForMarketing: false,
      },
    };

    const { queryByText, getByText } = renderWithProvider(
      <Fallback {...mockProps} />,
      { state: stateWithoutDataCollection },
    );

    expect(queryByText('Describe what happened')).toBeNull();
    expect(getByText('Contact support')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
  });

  it('opens modal when describe button is pressed', async () => {
    const { getByText, getByPlaceholderText } = renderWithProvider(
      <Fallback {...mockProps} />,
      { state: initialState },
    );

    const describeButton = getByText('Describe what happened');
    fireEvent.press(describeButton);

    await waitFor(() => {
      expect(
        getByPlaceholderText(
          'Sharing details like how we can reproduce the bug will help us fix the problem.',
        ),
      ).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Submit')).toBeTruthy();
    });
  });

  it('closes modal when cancel button is pressed', async () => {
    const { getByText, queryByText } = renderWithProvider(
      <Fallback {...mockProps} />,
      { state: initialState },
    );

    // Open modal
    const describeButton = getByText('Describe what happened');
    fireEvent.press(describeButton);

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });

    // Close modal
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    // Verify modal is closed
    await waitFor(() => {
      expect(queryByText('Cancel')).toBeNull();
    });
  });

  it('enables submit button when feedback is entered', async () => {
    const { getByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    // Open modal
    const describeButton = getByText('Describe what happened');

    await act(async () => {
      fireEvent.press(describeButton);
    });

    await waitFor(() => {
      const submitButton = getByText('Submit');
      if (!submitButton) {
        throw new Error('Could not find submit button');
      }
      expect(submitButton).toBeOnTheScreen();
    });
  });

  it('calls copyErrorToClipboard when copy button is pressed', () => {
    const { getByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    const copyButton = getByText('Copy');
    fireEvent.press(copyButton);

    expect(mockProps.copyErrorToClipboard).toHaveBeenCalledTimes(1);
  });

  it('calls showExportSeedphrase when save seedphrase link is pressed', () => {
    const { getAllByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    const seedphraseLink = getAllByText(
      strings('error_screen.save_seedphrase_2'),
    )[0];
    fireEvent.press(seedphraseLink);

    expect(mockProps.showExportSeedphrase).toHaveBeenCalledTimes(1);
  });

  it('submits feedback and shows success alert when submit is pressed', async () => {
    const spyAlert = jest.spyOn(Alert, 'alert');

    const { getByText, getByPlaceholderText } = renderWithProvider(
      <Fallback {...mockProps} />,
      { state: initialState },
    );

    const describeButton = getByText('Describe what happened');

    await act(async () => {
      fireEvent.press(describeButton);
    });

    // Wait for modal to open and find the text input
    await waitFor(() => {
      expect(
        getByPlaceholderText(
          'Sharing details like how we can reproduce the bug will help us fix the problem.',
        ),
      ).toBeTruthy();
    });

    const textInput = getByPlaceholderText(
      'Sharing details like how we can reproduce the bug will help us fix the problem.',
    );
    const submitButton = getByText('Submit');

    fireEvent.changeText(textInput, 'Test feedback');

    await act(async () => {
      fireEvent.press(submitButton);
    });

    expect(captureSentryFeedback).toHaveBeenCalledWith({
      sentryId: mockProps.sentryId,
      comments: 'Test feedback',
    });

    expect(spyAlert).toHaveBeenCalledWith(
      strings('error_screen.bug_report_thanks'),
    );
  });

  it('renders error message correctly', () => {
    const { getByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    expect(getByText('Test error message')).toBeTruthy();
  });

  describe('Onboarding Error Handling', () => {
    const mockCaptureExceptionForced = jest.mocked(captureExceptionForced);
    const onboardingProps = {
      ...mockProps,
      onboardingErrorConfig: {
        navigation: mockNavigation,
        error: mockError,
        view: 'Login',
      },
    };

    it('renders onboarding error state snapshot', () => {
      const { toJSON } = renderWithProvider(
        <ErrorBoundary
          view="Login"
          navigation={mockNavigation}
          error={mockError}
          useOnboardingErrorHandling
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('uses onboarding error config when useOnboardingErrorHandling is true', () => {
      renderWithProvider(
        <ErrorBoundary
          view="Login"
          navigation={mockNavigation}
          error={mockError}
          useOnboardingErrorHandling
        >
          <MockThrowComponent />
        </ErrorBoundary>,
        { state: initialState },
      );

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          View: 'Login',
          ErrorBoundary: true,
        }),
      );
    });

    it('renders onboarding error fallback with correct props', () => {
      const { getByText } = renderWithProvider(
        <Fallback {...onboardingProps} />,
        { state: initialState },
      );

      expect(getByText('An error occurred')).toBeTruthy();
      expect(getByText('Send report')).toBeTruthy();
      expect(getByText('Try again')).toBeTruthy();
    });

    it('calls captureExceptionForced and navigates to onboarding when Send report is pressed in onboarding mode', async () => {
      const { getByText } = renderWithProvider(
        <Fallback {...onboardingProps} />,
        { state: initialState },
      );

      const sendReportButton = getByText('Send report');
      fireEvent.press(sendReportButton);

      await waitFor(() => {
        expect(mockCaptureExceptionForced).toHaveBeenCalledWith(
          onboardingProps.onboardingErrorConfig.error,
          expect.objectContaining({
            view: onboardingProps.onboardingErrorConfig.view,
            context: 'ErrorBoundary forced report',
          }),
        );
        expect(mockNavigation.reset).toHaveBeenCalledWith({
          routes: [{ name: 'OnboardingRootNav' }],
        });
      });
    });

    it('navigates to onboarding when Try again is pressed in onboarding mode', () => {
      const { getByText } = renderWithProvider(
        <Fallback {...onboardingProps} />,
        { state: initialState },
      );

      const tryAgainButton = getByText('Try again');
      fireEvent.press(tryAgainButton);

      expect(mockNavigation.reset).toHaveBeenCalledWith({
        routes: [{ name: 'OnboardingRootNav' }],
      });
    });
  });

  describe('Support Consent Modal', () => {
    it('shows support consent modal when contact support is pressed', () => {
      const { getByText } = renderWithProvider(
        <ErrorBoundary view={'Root'}>
          <MockThrowComponent />
        </ErrorBoundary>,
      );

      const contactSupportButton = getByText(
        strings('error_screen.contact_support'),
      );
      fireEvent.press(contactSupportButton);

      expect(getByText(strings('support_consent.title'))).toBeTruthy();
    });

    it('consents to share information when consent button is pressed', async () => {
      (getSupportUrl as jest.Mock).mockResolvedValue(
        'https://support.metamask.io',
      );

      const { getByText } = renderWithProvider(
        <ErrorBoundary view={'Root'}>
          <MockThrowComponent />
        </ErrorBoundary>,
      );

      // Trigger the modal
      const contactSupportButton = getByText(
        strings('error_screen.contact_support'),
      );
      fireEvent.press(contactSupportButton);

      // Press consent button
      const consentButton = getByText(strings('support_consent.consent'));
      await act(async () => {
        fireEvent.press(consentButton);
      });

      expect(getSupportUrl).toHaveBeenCalledWith(true);
    });

    it('declines to share information when decline button is pressed', async () => {
      (getSupportUrl as jest.Mock).mockResolvedValue(
        'https://support.metamask.io',
      );

      const { getByText } = renderWithProvider(
        <ErrorBoundary view={'Root'}>
          <MockThrowComponent />
        </ErrorBoundary>,
      );

      // Trigger the modal
      const contactSupportButton = getByText(
        strings('error_screen.contact_support'),
      );
      fireEvent.press(contactSupportButton);

      // Press decline button
      const declineButton = getByText(strings('support_consent.decline'));
      await act(async () => {
        fireEvent.press(declineButton);
      });

      expect(getSupportUrl).toHaveBeenCalledWith(false);
    });

    it('falls back to base URL when consent request fails', async () => {
      (getSupportUrl as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );
      (getSupportUrl as jest.Mock).mockResolvedValueOnce(
        'https://support.metamask.io',
      );

      const { getByText } = renderWithProvider(
        <ErrorBoundary view={'Root'}>
          <MockThrowComponent />
        </ErrorBoundary>,
      );

      // Trigger the modal
      const contactSupportButton = getByText(
        strings('error_screen.contact_support'),
      );
      fireEvent.press(contactSupportButton);

      // Press consent button and wait for fallback
      const consentButton = getByText(strings('support_consent.consent'));
      await act(async () => {
        fireEvent.press(consentButton);
      });

      // Verify getSupportUrl was called twice (once with true, once with false for fallback)
      expect(getSupportUrl).toHaveBeenCalledTimes(2);
      expect(getSupportUrl).toHaveBeenNthCalledWith(1, true);
      expect(getSupportUrl).toHaveBeenNthCalledWith(2, false);
    });
  });
});
