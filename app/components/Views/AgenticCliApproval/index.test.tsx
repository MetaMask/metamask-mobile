import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import Logger from '../../../util/Logger';
import { AgenticCliApprovalAuthService } from './AgenticCliApprovalAuthService';
import AgenticCliApproval from './index';

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

jest.mock('./AgenticCliApprovalAuthService', () => ({
  AgenticCliApprovalAuthService: {
    getAuthToken: jest.fn(),
  },
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'agentic_cli_approval.error.title': 'Something went wrong',
      'agentic_cli_approval.error.load_description':
        "We couldn't load this approval request. Check your connection and try again.",
      'agentic_cli_approval.error.submit_description':
        "We couldn't complete this approval. Close this screen and start the CLI request again.",
      'agentic_cli_approval.error.try_again': 'Try again',
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
        testID: props.testID || 'agentic-cli-approval',
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
          { testID: 'agentic-cli-approval-header' },
          title,
        ),
      ),
    };
  },
);

const mockGetAuthToken =
  AgenticCliApprovalAuthService.getAuthToken as jest.Mock;

describe('AgenticCliApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebViewProps = {};
    mockGetAuthToken.mockResolvedValue('dashboard-token');
  });

  it('shows submit failures as secondary error details', async () => {
    const rawError =
      'Failed to submit approval: HTTP 401 - {"statusCode":401,"error":"Unauthorized","message":"CLI auth token expired or unavailable"}';
    const { getByTestId, queryByText } = render(<AgenticCliApproval />);

    await waitFor(() =>
      expect(getByTestId('agentic-cli-approval')).toBeTruthy(),
    );

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
    expect(getByTestId('agentic-cli-approval-error-title').props.children).toBe(
      'Something went wrong',
    );
    expect(
      getByTestId('agentic-cli-approval-error-description').props.children,
    ).toBe(
      "We couldn't complete this approval. Close this screen and start the CLI request again.",
    );
    expect(
      getByTestId('agentic-cli-approval-error-details').props.children,
    ).toBe(rawError);
    expect(queryByText(rawError)).not.toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'AgenticCliApproval: hosted approval page reported an error',
    );
  });

  it('lets the user retry WebView load errors', async () => {
    const { getByTestId, queryByTestId } = render(<AgenticCliApproval />);

    await waitFor(() =>
      expect(getByTestId('agentic-cli-approval')).toBeTruthy(),
    );

    act(() => {
      mockWebViewProps.onError?.({
        nativeEvent: {
          description: 'The request timed out',
          statusCode: 0,
          url: 'https://developer.metamask.io/agentic/login',
        },
      });
    });

    expect(
      getByTestId('agentic-cli-approval-error-description').props.children,
    ).toBe(
      "We couldn't load this approval request. Check your connection and try again.",
    );
    expect(
      getByTestId('agentic-cli-approval-error-details').props.children,
    ).toBe('The request timed out');
    expect(queryByTestId('agentic-cli-approval')).toBeNull();

    fireEvent.press(getByTestId('agentic-cli-approval-retry-button'));

    await waitFor(() => {
      expect(mockGetAuthToken).toHaveBeenCalledTimes(2);
      expect(getByTestId('agentic-cli-approval')).toBeTruthy();
    });
  });
});
