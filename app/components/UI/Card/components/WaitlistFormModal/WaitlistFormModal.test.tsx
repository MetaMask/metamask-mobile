import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import WaitlistFormModal from './WaitlistFormModal';
import Routes from '../../../../../constants/navigation/Routes';

// Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Route params
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({ url: 'https://share.hsforms.com/test-form' }),
}));

// Theme
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      success: { default: 'colors.success.default' },
    },
  }),
}));

// Toast
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: mockCloseToast },
};

jest.mock('../../../../../component-library/components/Toast', () => {
  const ActualReact = jest.requireActual('react');
  return {
    ToastContext: ActualReact.createContext({ toastRef: undefined }),
    ToastVariants: { Icon: 'Icon' },
    ButtonIconVariant: { Icon: 'Icon' },
  };
});

// Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

// Design system
jest.mock('@metamask/design-system-react-native', () => {
  const ActualReact = jest.requireActual('react');
  const { Text: RNText, TouchableOpacity } = jest.requireActual('react-native');
  return {
    Text: ({
      children,
      testID,
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ActualReact.createElement(RNText, { testID }, children),
    Button: ({
      children,
      onPress,
      testID,
    }: React.PropsWithChildren<{
      onPress?: () => void;
      testID?: string;
    }>) =>
      ActualReact.createElement(
        TouchableOpacity,
        { onPress, testID },
        children,
      ),
    ButtonIcon: ({
      onPress,
      testID,
    }: {
      onPress?: () => void;
      testID?: string;
    }) =>
      ActualReact.createElement(TouchableOpacity, { onPress, testID }, 'Back'),
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Md: 'Md' },
    ButtonIconSize: { Md: 'Md' },
    TextVariant: { BodyMd: 'BodyMd' },
    IconName: {
      ArrowLeft: 'ArrowLeft',
      Confirmation: 'Confirmation',
      Close: 'Close',
    },
  };
});

// i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// WebView — captures event handlers so tests can fire them
let mockOnLoadStart: (() => void) | null = null;
let mockOnLoadEnd: (() => void) | null = null;
let mockOnError: (() => void) | null = null;
let mockOnMessage: ((event: { nativeEvent: { data: string } }) => void) | null =
  null;

jest.mock('@metamask/react-native-webview', () => {
  const ActualReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    WebView: ({
      onLoadStart,
      onLoadEnd,
      onError,
      onMessage,
      testID,
    }: {
      onLoadStart?: () => void;
      onLoadEnd?: () => void;
      onError?: () => void;
      onHttpError?: () => void;
      onMessage?: (event: { nativeEvent: { data: string } }) => void;
      testID?: string;
    }) => {
      mockOnLoadStart = onLoadStart || null;
      mockOnLoadEnd = onLoadEnd || null;
      mockOnError = onError || null;
      mockOnMessage = onMessage || null;
      return ActualReact.createElement(View, { testID });
    },
  };
});

// Helper: render with ToastContext provided
import { ToastContext } from '../../../../../component-library/components/Toast';

const renderComponent = () =>
  render(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <WaitlistFormModal />
    </ToastContext.Provider>,
  );

describe('WaitlistFormModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLoadStart = null;
    mockOnLoadEnd = null;
    mockOnError = null;
    mockOnMessage = null;
  });

  describe('Rendering', () => {
    it('renders the WebView', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('waitlist-form-webview')).toBeTruthy();
    });

    it('shows the loading overlay initially', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('waitlist-form-loading')).toBeTruthy();
    });

    it('renders the back button in the header', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('waitlist-form-back-button')).toBeTruthy();
    });
  });

  describe('Loading', () => {
    it('hides the loading overlay after the WebView finishes loading', () => {
      const { queryByTestId } = renderComponent();
      expect(queryByTestId('waitlist-form-loading')).toBeTruthy();

      act(() => {
        mockOnLoadEnd?.();
      });

      expect(queryByTestId('waitlist-form-loading')).not.toBeOnTheScreen();
    });

    it('shows the loading overlay again when a new load starts', () => {
      const { queryByTestId } = renderComponent();

      act(() => {
        mockOnLoadEnd?.();
      });
      expect(queryByTestId('waitlist-form-loading')).not.toBeOnTheScreen();

      act(() => {
        mockOnLoadStart?.();
      });
      expect(queryByTestId('waitlist-form-loading')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('shows the error container when the WebView fails to load', () => {
      const { getByTestId, queryByTestId } = renderComponent();

      act(() => {
        mockOnError?.();
      });

      expect(getByTestId('waitlist-form-error-container')).toBeTruthy();
      expect(queryByTestId('waitlist-form-webview')).not.toBeOnTheScreen();
    });

    it('retry button clears the error and shows the WebView again', () => {
      const { getByTestId, queryByTestId } = renderComponent();

      act(() => {
        mockOnError?.();
      });
      expect(getByTestId('waitlist-form-error-container')).toBeTruthy();

      fireEvent.press(getByTestId('waitlist-form-retry-button'));

      expect(
        queryByTestId('waitlist-form-error-container'),
      ).not.toBeOnTheScreen();
      expect(getByTestId('waitlist-form-webview')).toBeTruthy();
    });

    it('retry button shows loading overlay', () => {
      const { getByTestId } = renderComponent();

      act(() => {
        mockOnError?.();
        mockOnLoadEnd?.();
      });

      fireEvent.press(getByTestId('waitlist-form-retry-button'));

      expect(getByTestId('waitlist-form-loading')).toBeTruthy();
    });
  });

  describe('Back button', () => {
    it('calls navigation.goBack() when the back button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('waitlist-form-back-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('HubSpot form submission', () => {
    it('shows a success toast when the form is submitted', () => {
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            data: JSON.stringify({ type: 'hs_form_submitted' }),
          },
        });
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          hasNoTimeout: true,
        }),
      );
    });

    it('navigates to wallet home when the form is submitted', () => {
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            data: JSON.stringify({ type: 'hs_form_submitted' }),
          },
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('does not trigger success flow for unrelated message types', () => {
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            data: JSON.stringify({ type: 'some_other_event' }),
          },
        });
      });

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not throw on non-JSON message data', () => {
      renderComponent();

      expect(() => {
        act(() => {
          mockOnMessage?.({ nativeEvent: { data: 'not-json' } });
        });
      }).not.toThrow();
    });
  });
});
