import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import ImmersveKYCModal, {
  setImmersveKycOnClose,
  clearImmersveKycOnClose,
} from './ImmersveKYCModal';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    url: 'https://verify.immersve.com/session',
    redirectUrl: 'https://metamask.io/card/kyc-complete',
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

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
    }: React.PropsWithChildren<{ onPress?: () => void; testID?: string }>) =>
      ActualReact.createElement(
        TouchableOpacity,
        { onPress, testID },
        children,
      ),
    HeaderStandard: ({
      onBack,
      backButtonProps,
    }: {
      onBack?: () => void;
      backButtonProps?: { testID?: string };
    }) =>
      ActualReact.createElement(
        TouchableOpacity,
        { onPress: onBack, testID: backButtonProps?.testID },
        'Back',
      ),
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Md: 'Md' },
    TextVariant: { BodyMd: 'BodyMd' },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

let capturedProps: {
  onNavigationStateChange?: (s: { url: string }) => void;
  mediaPlaybackRequiresUserGesture?: boolean;
} = {};

jest.mock('@metamask/react-native-webview', () => {
  const ActualReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    WebView: (props: {
      onNavigationStateChange?: (s: { url: string }) => void;
      mediaPlaybackRequiresUserGesture?: boolean;
      testID?: string;
    }) => {
      capturedProps = props;
      return ActualReact.createElement(View, { testID: props.testID });
    },
  };
});

describe('ImmersveKYCModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedProps = {};
    clearImmersveKycOnClose();
  });

  it('renders the WebView with the Android camera flag enabled', () => {
    const { getByTestId } = render(<ImmersveKYCModal />);
    expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    expect(capturedProps.mediaPlaybackRequiresUserGesture).toBe(false);
  });

  it('closes when the webview navigates to the redirect URL', async () => {
    render(<ImmersveKYCModal />);
    await act(async () => {
      capturedProps.onNavigationStateChange?.({
        url: 'https://metamask.io/card/kyc-complete?status=done',
      });
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not close on unrelated navigation', async () => {
    render(<ImmersveKYCModal />);
    await act(async () => {
      capturedProps.onNavigationStateChange?.({
        url: 'https://verify.immersve.com/step-2',
      });
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('closes when the back button is pressed', () => {
    const { getByTestId } = render(<ImmersveKYCModal />);
    fireEvent.press(getByTestId('immersve-kyc-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('fires the registered onClose callback on redirect close', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    render(<ImmersveKYCModal />);
    await act(async () => {
      capturedProps.onNavigationStateChange?.({
        url: 'https://metamask.io/card/kyc-complete?status=done',
      });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('fires the registered onClose callback on back-button close', () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    const { getByTestId } = render(<ImmersveKYCModal />);
    fireEvent.press(getByTestId('immersve-kyc-back-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalled();
  });
});
