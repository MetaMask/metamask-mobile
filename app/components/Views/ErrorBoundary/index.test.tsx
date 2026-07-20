import React, { useEffect } from 'react';
import { View, Alert, Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ErrorBoundary, { Fallback } from './';
import {
  captureSentryFeedback,
  captureExceptionForced,
} from '../../../util/sentry/utils';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import { analytics } from '../../../util/analytics/analytics';
import { reloadAppAsync } from 'expo';
import { METAMASK_SUPPORT_URL } from '../../../constants/urls';
import { navigateToSupportConsent } from '../../../util/support';

jest.mock('../../../util/support', () => ({
  navigateToSupportConsent: jest.fn(),
}));

jest.mock('expo', () => ({
  reloadAppAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../../util/sentry/utils', () => ({
  captureSentryFeedback: jest.fn(),
  captureExceptionForced: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock(
  'react-native/Libraries/Components/Keyboard/KeyboardAvoidingView',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: View,
    };
  },
);

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
    openTicket: jest.fn(),
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

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('renders without errors', () => {
    expect(() => renderWithProvider(<ErrorBoundary />, {})).not.toThrow();
  });

  it('tracks error event when error is thrown by child component', () => {
    renderWithProvider(
      <ErrorBoundary view={'Root'}>
        <MockThrowComponent />
      </ErrorBoundary>,
    );

    expect(jest.mocked(analytics.trackEvent)).toHaveBeenCalled();
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
  });

  it('closes modal when cancel button is pressed', async () => {
    const { getByText, queryByText } = renderWithProvider(
      <Fallback {...mockProps} />,
      { state: initialState },
    );

    // Open modal
    const describeButton = getByText('Describe what happened');
    await act(async () => {
      fireEvent.press(describeButton);
    });

    await waitFor(() => {
      expect(getByText('Cancel')).toBeOnTheScreen();
    });

    // Close modal
    const cancelButton = getByText('Cancel');
    await act(async () => {
      fireEvent.press(cancelButton);
    });

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

  it('calls copyErrorToClipboard when copy button is pressed', async () => {
    const { getByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    const copyButton = getByText('Copy');
    await act(async () => {
      fireEvent.press(copyButton);
    });

    expect(mockProps.copyErrorToClipboard).toHaveBeenCalledTimes(1);
  });

  it('calls reloadAppAsync when Try again is pressed', async () => {
    const { getByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    const tryAgainButton = getByText('Try again');
    await act(async () => {
      fireEvent.press(tryAgainButton);
    });

    expect(reloadAppAsync).toHaveBeenCalledTimes(1);
    expect(reloadAppAsync).toHaveBeenCalledWith('Error boundary Try again');
  });

  it('calls showExportSeedphrase when save seedphrase link is pressed', async () => {
    const { getAllByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    const seedphraseLink = getAllByText(
      strings('error_screen.save_seedphrase_2'),
    )[0];
    await act(async () => {
      fireEvent.press(seedphraseLink);
    });

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

    const textInput = await waitFor(() => {
      const input = getByPlaceholderText(
        'Sharing details like how we can reproduce the bug will help us fix the problem.',
      );
      expect(input).toBeOnTheScreen();
      return input;
    });

    await act(async () => {
      fireEvent.changeText(textInput, 'Test feedback');
    });

    const submitButton = getByText('Submit');
    await act(async () => {
      fireEvent.press(submitButton);
    });

    expect(captureSentryFeedback).toHaveBeenCalledWith({
      sentryId: mockProps.sentryId,
      comments: 'Test feedback',
    });

    expect(spyAlert).toHaveBeenCalledWith(
      'Thanks! We\u2019ll take a look soon.',
    );
  });

  it('delegates to openTicket when Contact support is pressed', async () => {
    const { getByText } = renderWithProvider(<Fallback {...mockProps} />, {
      state: initialState,
    });

    const contactSupportButton = getByText(
      strings('error_screen.contact_support'),
    );
    await act(async () => {
      fireEvent.press(contactSupportButton);
    });

    expect(mockProps.openTicket).toHaveBeenCalledTimes(1);
  });

  describe('openTicket (class component)', () => {
    it('shows the consent sheet via navigateToSupportConsent when navigation is available', () => {
      const instance = new ErrorBoundary({
        view: 'Test',
        navigation: mockNavigation,
      });

      instance.openTicket();

      expect(navigateToSupportConsent).toHaveBeenCalledWith(
        mockNavigation,
        expect.any(Function),
        METAMASK_SUPPORT_URL,
      );

      const [, open] = jest.mocked(navigateToSupportConsent).mock.calls[0];
      const spyOpenURL = jest.spyOn(Linking, 'openURL');
      open('https://support.metamask.io/?customer_service_token=jwt-token');
      expect(spyOpenURL).toHaveBeenCalledWith(
        'https://support.metamask.io/?customer_service_token=jwt-token',
      );
    });

    it('opens the plain support URL via Linking when no navigation is available', () => {
      const instance = new ErrorBoundary({ view: 'Test' });
      const spyOpenURL = jest.spyOn(Linking, 'openURL');

      instance.openTicket();

      expect(spyOpenURL).toHaveBeenCalledWith(METAMASK_SUPPORT_URL);
      expect(navigateToSupportConsent).not.toHaveBeenCalled();
    });
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

    it('renders onboarding error state without errors', () => {
      expect(() =>
        renderWithProvider(
          <ErrorBoundary
            view="Login"
            navigation={mockNavigation}
            error={mockError}
            useOnboardingErrorHandling
          />,
        ),
      ).not.toThrow();
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

      expect(jest.mocked(analytics.trackEvent)).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          View: 'Login',
          ErrorBoundary: true,
        }),
      );
    });

    it('calls captureExceptionForced and navigates to onboarding when Send report is pressed in onboarding mode', async () => {
      const { getByText } = renderWithProvider(
        <Fallback {...onboardingProps} />,
        { state: initialState },
      );

      const sendReportButton = getByText('Send report');
      await act(async () => {
        fireEvent.press(sendReportButton);
      });

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

    it('navigates to onboarding when Try again is pressed in onboarding mode', async () => {
      const { getByText } = renderWithProvider(
        <Fallback {...onboardingProps} />,
        { state: initialState },
      );

      const tryAgainButton = getByText('Try again');
      await act(async () => {
        fireEvent.press(tryAgainButton);
      });

      expect(mockNavigation.reset).toHaveBeenCalledWith({
        routes: [{ name: 'OnboardingRootNav' }],
      });
    });
  });
});
