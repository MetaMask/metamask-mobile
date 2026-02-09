import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { captureException } from '@sentry/react-native';
import SRPErrorScreen from './SRPErrorScreen';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../../core/AppConstants';
import renderWithProvider from '../../../util/test/renderWithProvider';

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      reset: mockReset,
    }),
  };
});

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../../core', () => ({
  Authentication: {
    deleteWallet: jest.fn().mockResolvedValue(undefined),
  },
}));

import { Authentication } from '../../../core';

describe('SRPErrorScreen', () => {
  const mockError = new Error('Test wallet creation error');
  mockError.name = 'WalletCreationError';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders title text', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('renders error report with error details', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      expect(
        getByText(
          'View: ChoosePassword\nError: WalletCreationError\nTest wallet creation error',
        ),
      ).toBeTruthy();
    });

    it('renders Send error report button', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      expect(getByText('Send error report')).toBeTruthy();
    });

    it('renders Try again button', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      expect(getByText('Try again')).toBeTruthy();
    });

    it('renders Copy button', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      expect(getByText('Copy')).toBeTruthy();
    });

    it('renders MetaMask Support link', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      expect(getByText('MetaMask Support')).toBeTruthy();
    });
  });

  describe('handleTryAgain', () => {
    it('deletes wallet and navigates to onboarding root when Try again is pressed', async () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      await act(async () => {
        fireEvent.press(getByText('Try again'));
      });

      expect(Authentication.deleteWallet).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
      });
    });
  });

  describe('handleSendErrorReport', () => {
    it('sends error to Sentry when Send error report is pressed', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      fireEvent.press(getByText('Send error report'));

      expect(captureException).toHaveBeenCalledWith(mockError, {
        tags: {
          view: 'WalletCreationError',
          context: 'User manually sent error report - SRP flow',
        },
      });
    });

    it('navigates to onboarding with toast param when Send error report is pressed', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      fireEvent.press(getByText('Send error report'));

      expect(mockReset).toHaveBeenCalledWith({
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            params: {
              screen: Routes.ONBOARDING.NAV,
              params: {
                screen: Routes.ONBOARDING.ONBOARDING,
                params: { showErrorReportSentToast: true },
              },
            },
          },
        ],
      });
    });
  });

  describe('handleCopyError', () => {
    it('copies error report to clipboard when Copy is pressed', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      fireEvent.press(getByText('Copy'));

      expect(Clipboard.setString).toHaveBeenCalledWith(
        'View: ChoosePassword\nError: WalletCreationError\nTest wallet creation error',
      );
    });

    it('displays Copied text after copying', async () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      fireEvent.press(getByText('Copy'));

      await waitFor(() => {
        expect(getByText('Copied')).toBeTruthy();
      });
    });

    it('reverts to Copy text after 2 seconds', async () => {
      const { getByText, queryByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      fireEvent.press(getByText('Copy'));

      await waitFor(() => {
        expect(getByText('Copied')).toBeTruthy();
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(queryByText('Copied')).toBeNull();
        expect(getByText('Copy')).toBeTruthy();
      });
    });
  });

  describe('handleContactSupport', () => {
    it('opens support URL when MetaMask Support is pressed', () => {
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      fireEvent.press(getByText('MetaMask Support'));

      expect(Linking.openURL).toHaveBeenCalledWith(
        AppConstants.REVIEW_PROMPT.SUPPORT,
      );
    });
  });

  describe('edge cases', () => {
    it('displays Unknown for error name when error has no name', () => {
      const errorWithoutName = new Error('Some message');
      errorWithoutName.name = '';

      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={errorWithoutName} />,
      );

      expect(
        getByText('View: ChoosePassword\nError: Unknown\nSome message'),
      ).toBeTruthy();
    });

    it('displays No message when error has no message', () => {
      const errorWithoutMessage = new Error();
      errorWithoutMessage.name = 'TestError';
      errorWithoutMessage.message = '';

      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={errorWithoutMessage} />,
      );

      expect(
        getByText('View: ChoosePassword\nError: TestError\nNo message'),
      ).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    it('clears timeout on unmount', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { getByText, unmount } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      // Trigger copy to start a timeout
      fireEvent.press(getByText('Copy'));

      await waitFor(() => {
        expect(getByText('Copied')).toBeTruthy();
      });

      // Unmount component
      unmount();

      // Verify clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('clears previous timeout when copying multiple times', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { getByText } = renderWithProvider(
        <SRPErrorScreen error={mockError} />,
      );

      fireEvent.press(getByText('Copy'));

      await waitFor(() => {
        expect(getByText('Copied')).toBeTruthy();
      });

      fireEvent.press(getByText('Copied'));

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
