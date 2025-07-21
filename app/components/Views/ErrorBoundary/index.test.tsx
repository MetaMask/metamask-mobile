import React, { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ErrorBoundary, { Fallback } from './';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import {
  captureSentryFeedback,
  captureExceptionForced,
} from '../../../util/sentry/utils';
import Logger from '../../../util/Logger';
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

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
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

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(<ErrorBoundary />, {});
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

    await waitFor(() => {
      const textInput = getByPlaceholderText(
        'Sharing details like how we can reproduce the bug will help us fix the problem.',
      );
      const submitButton = getByText('Submit');
      fireEvent.changeText(textInput, 'Test feedback');

      fireEvent.press(submitButton);

      expect(captureSentryFeedback).toHaveBeenCalledWith({
        sentryId: mockProps.sentryId,
        comments: 'Test feedback',
      });

      expect(spyAlert).toHaveBeenCalledWith('Thanks! We’ll take a look soon.');
    });
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
});
