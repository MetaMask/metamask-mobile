import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import Logger from '../../../util/Logger';
import { MfaWebviewAuthService } from './MfaWebviewAuthService';
import MfaWebview from './index';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    approvalPageLink: 'https://developer.metamask.io/agentic/login',
    projectId: 'project-1',
    notificationId: 'request-1',
    approvalId: 'approval-1',
    mimirSignature: 'signature-1',
    operationType: 'transaction_request',
  }),
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('./MfaWebviewAuthService', () => ({
  MfaWebviewAuthService: {
    getAuthToken: jest.fn(),
  },
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'mfa_webview.error.title': 'Something went wrong',
      'mfa_webview.error.load_description':
        "We couldn't load this approval request. Check your connection and try again.",
      'mfa_webview.error.submit_description':
        "We couldn't complete this approval. Close this screen and start the CLI request again.",
      'mfa_webview.error.try_again': 'Try again',
      'navigation.close': 'Close',
    };
    return map[key] || key;
  },
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
    }: React.PropsWithChildren<{
      onPress?: () => void;
      testID?: string;
    }>) =>
      ActualReact.createElement(
        TouchableOpacity,
        { onPress, testID },
        children,
      ),
    TextVariant: { BodyMd: 'BodyMd', HeadingMd: 'HeadingMd' },
    FontWeight: { Regular: 'Regular', Bold: 'Bold' },
    ButtonVariant: { Primary: 'Primary', Secondary: 'Secondary' },
    ButtonSize: { Md: 'Md', Sm: 'Sm' },
    IconName: { Close: 'Close' },
  };
});

interface MockWebViewProps {
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  onError?: (event: {
    nativeEvent: { description: string; statusCode: number; url: string };
  }) => void;
  testID?: string;
}

let mockWebViewProps: MockWebViewProps = {};

jest.mock('@metamask/react-native-webview', () => {
  const ActualReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    WebView: (props: MockWebViewProps) => {
      mockWebViewProps = props;
      return ActualReact.createElement(View, {
        testID: props.testID || 'mfa-webview',
      });
    },
  };
});

jest.mock(
  '../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ActualReact = jest.requireActual('react');
    const { Text: RNText } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: jest.fn(({ title }: { title: string }) =>
        ActualReact.createElement(
          RNText,
          { testID: 'mfa-webview-header' },
          title,
        ),
      ),
    };
  },
);

const mockGetAuthToken = MfaWebviewAuthService.getAuthToken as jest.Mock;

describe('MfaWebview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebViewProps = {};
    mockGetAuthToken.mockResolvedValue('dashboard-token');
  });

  it('shows submit failures as secondary error details', async () => {
    const rawError =
      'Failed to submit approval: HTTP 401 - {"statusCode":401,"error":"Unauthorized","message":"CLI auth token expired or unavailable"}';
    const { getByTestId, queryByText } = render(<MfaWebview />);

    await waitFor(() => expect(getByTestId('mfa-webview')).toBeTruthy());

    act(() => {
      mockWebViewProps.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            source: 'mm-cli-mfa',
            type: 'error',
            approvalId: 'approval-1',
            message: rawError,
          }),
        },
      });
    });

    expect(HeaderCompactStandard).toHaveBeenCalledWith(
      expect.objectContaining({ includesTopInset: true }),
      undefined,
    );
    expect(getByTestId('mfa-webview-error-title').props.children).toBe(
      'Something went wrong',
    );
    expect(getByTestId('mfa-webview-error-description').props.children).toBe(
      "We couldn't complete this approval. Close this screen and start the CLI request again.",
    );
    expect(getByTestId('mfa-webview-error-details').props.children).toBe(
      rawError,
    );
    expect(queryByText(rawError)).not.toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'MfaWebview: hosted approval page reported an error',
    );
  });

  it('lets the user retry WebView load errors', async () => {
    const { getByTestId, queryByTestId } = render(<MfaWebview />);

    await waitFor(() => expect(getByTestId('mfa-webview')).toBeTruthy());

    act(() => {
      mockWebViewProps.onError?.({
        nativeEvent: {
          description: 'The request timed out',
          statusCode: 0,
          url: 'https://developer.metamask.io/agentic/login',
        },
      });
    });

    expect(getByTestId('mfa-webview-error-description').props.children).toBe(
      "We couldn't load this approval request. Check your connection and try again.",
    );
    expect(getByTestId('mfa-webview-error-details').props.children).toBe(
      'The request timed out',
    );
    expect(queryByTestId('mfa-webview')).toBeNull();

    fireEvent.press(getByTestId('mfa-webview-retry-button'));

    await waitFor(() => {
      expect(mockGetAuthToken).toHaveBeenCalledTimes(2);
      expect(getByTestId('mfa-webview')).toBeTruthy();
    });
  });
});
