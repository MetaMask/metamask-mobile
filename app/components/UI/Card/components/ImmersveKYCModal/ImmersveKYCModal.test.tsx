import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ImmersveKYCModal from './ImmersveKYCModal';

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
    IconName: { ArrowLeft: 'ArrowLeft' },
  };
});

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
  });

  it('renders the WebView with the Android camera flag enabled', () => {
    const { getByTestId } = render(<ImmersveKYCModal />);
    expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    expect(capturedProps.mediaPlaybackRequiresUserGesture).toBe(false);
  });

  it('closes when the webview navigates to the redirect URL', () => {
    render(<ImmersveKYCModal />);
    capturedProps.onNavigationStateChange?.({
      url: 'https://metamask.io/card/kyc-complete?status=done',
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not close on unrelated navigation', () => {
    render(<ImmersveKYCModal />);
    capturedProps.onNavigationStateChange?.({
      url: 'https://verify.immersve.com/step-2',
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('closes when the back button is pressed', () => {
    const { getByTestId } = render(<ImmersveKYCModal />);
    fireEvent.press(getByTestId('immersve-kyc-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
