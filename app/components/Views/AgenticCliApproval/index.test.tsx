import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import Logger from '../../../util/Logger';
import { AgenticCliApprovalService } from './AgenticCliApprovalService';
import AgenticCliApproval from './index';

const mockGoBack = jest.fn();

const defaultApprovalParams = {
  approvalPagePath: '/agentic/login',
  projectId: 'project-1',
  approvalId: 'approval-1',
  mimirSignature: 'signature-1',
  operationType: 'transaction_request',
};

const mockUseParams = jest.fn(() => defaultApprovalParams);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('../../../core/AgenticCli/agenticCliConnectionSession', () => ({
  waitForAgenticCliLoginConnectionEstablished: jest
    .fn()
    .mockResolvedValue(undefined),
}));

jest.mock('./AgenticCliApprovalService', () => {
  const actual = jest.requireActual('./AgenticCliApprovalService');
  return {
    ...actual,
    AgenticCliApprovalService: {
      ...actual.AgenticCliApprovalService,
      getAuthToken: jest.fn(),
      buildWebViewUrl: jest.fn(
        () =>
          'https://developer.metamask.io/agentic/login?projectId=project-1&approvalId=approval-1#auth_token=token',
      ),
    },
  };
});

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'agentic_cli_approval.title': 'Review request',
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
  onShouldStartLoadWithRequest?: (request: {
    url: string;
    isTopFrame?: boolean;
  }) => boolean;
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

const mockGetAuthToken = AgenticCliApprovalService.getAuthToken as jest.Mock;
const mockWaitForAgenticCliLoginConnectionEstablished = jest.requireMock(
  '../../../core/AgenticCli/agenticCliConnectionSession',
).waitForAgenticCliLoginConnectionEstablished as jest.Mock;

describe('AgenticCliApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebViewProps = {};
    mockUseParams.mockReturnValue(defaultApprovalParams);
    mockGetAuthToken.mockResolvedValue('dashboard-token');
    mockWaitForAgenticCliLoginConnectionEstablished.mockResolvedValue(
      undefined,
    );
  });

  it('waits for CLI login connection before minting for login deeplinks', async () => {
    mockUseParams.mockReturnValue({
      ...defaultApprovalParams,
      operationType: 'login',
    });

    render(<AgenticCliApproval />);

    await waitFor(() =>
      expect(
        mockWaitForAgenticCliLoginConnectionEstablished,
      ).toHaveBeenCalled(),
    );
    expect(mockGetAuthToken).toHaveBeenCalled();
  });

  it('waits for CLI login connection before minting for tx_approve deeplinks', async () => {
    mockUseParams.mockReturnValue({
      ...defaultApprovalParams,
      operationType: 'tx_approve',
    });

    render(<AgenticCliApproval />);

    await waitFor(() =>
      expect(
        mockWaitForAgenticCliLoginConnectionEstablished,
      ).toHaveBeenCalled(),
    );
    expect(mockGetAuthToken).toHaveBeenCalled();
  });

  it('does not wait for CLI login connection before minting for other deeplinks', async () => {
    render(<AgenticCliApproval />);

    await waitFor(() => expect(mockGetAuthToken).toHaveBeenCalled());
    expect(
      mockWaitForAgenticCliLoginConnectionEstablished,
    ).not.toHaveBeenCalled();
  });

  it('renders the localized header title after the WebView loads', async () => {
    render(<AgenticCliApproval />);

    await waitFor(() =>
      expect(HeaderCompactStandard).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Review request' }),
        undefined,
      ),
    );
  });

  it('navigates back when the hosted page posts approved', async () => {
    render(<AgenticCliApproval />);

    await waitFor(() => expect(mockWebViewProps.onMessage).toBeDefined());

    act(() => {
      mockWebViewProps.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            source: 'mm-cli-mfa',
            type: 'approved',
            approvalId: 'approval-1',
          }),
        },
      });
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back when the hosted page posts rejected', async () => {
    render(<AgenticCliApproval />);

    await waitFor(() => expect(mockWebViewProps.onMessage).toBeDefined());

    act(() => {
      mockWebViewProps.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            source: 'mm-cli-mfa',
            type: 'rejected',
            approvalId: 'approval-1',
          }),
        },
      });
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back when the hosted page posts close', async () => {
    render(<AgenticCliApproval />);

    await waitFor(() => expect(mockWebViewProps.onMessage).toBeDefined());

    act(() => {
      mockWebViewProps.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            source: 'mm-cli-mfa',
            type: 'close',
            approvalId: 'approval-1',
          }),
        },
      });
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('ignores postMessage events when approvalId does not match route params', async () => {
    render(<AgenticCliApproval />);

    await waitFor(() => expect(mockWebViewProps.onMessage).toBeDefined());

    act(() => {
      mockWebViewProps.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            source: 'mm-cli-mfa',
            type: 'approved',
            approvalId: 'other-approval',
          }),
        },
      });
    });

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows load error UI when auth token resolution fails', async () => {
    mockGetAuthToken.mockRejectedValue(new Error('Token exchange failed'));

    const { getByTestId } = render(<AgenticCliApproval />);

    await waitFor(() =>
      expect(
        getByTestId('agentic-cli-approval-error-description').props.children,
      ).toBe(
        "We couldn't load this approval request. Check your connection and try again.",
      ),
    );

    expect(
      getByTestId('agentic-cli-approval-error-details').props.children,
    ).toBe('Token exchange failed');
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'AgenticCliApproval: failed to obtain auth token',
    );
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

  describe('onShouldStartLoadWithRequest', () => {
    beforeEach(() => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('allows allowlisted origins in subframes', async () => {
      render(<AgenticCliApproval />);

      await waitFor(() =>
        expect(mockWebViewProps.onShouldStartLoadWithRequest).toBeDefined(),
      );

      expect(
        mockWebViewProps.onShouldStartLoadWithRequest?.({
          url: 'https://js.stripe.com/v3/controller-with-preconnect.html',
          isTopFrame: false,
        }),
      ).toBe(true);
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('blocks disallowed origins in subframes without opening externally', async () => {
      render(<AgenticCliApproval />);

      await waitFor(() =>
        expect(mockWebViewProps.onShouldStartLoadWithRequest).toBeDefined(),
      );

      expect(
        mockWebViewProps.onShouldStartLoadWithRequest?.({
          url: 'https://example.com/phishing',
          isTopFrame: false,
        }),
      ).toBe(false);
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('blocks disallowed origins when isTopFrame is omitted', async () => {
      render(<AgenticCliApproval />);

      await waitFor(() =>
        expect(mockWebViewProps.onShouldStartLoadWithRequest).toBeDefined(),
      );

      expect(
        mockWebViewProps.onShouldStartLoadWithRequest?.({
          url: 'https://example.com/phishing',
        }),
      ).toBe(false);
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('opens disallowed top-frame navigations externally', async () => {
      render(<AgenticCliApproval />);

      await waitFor(() =>
        expect(mockWebViewProps.onShouldStartLoadWithRequest).toBeDefined(),
      );

      expect(
        mockWebViewProps.onShouldStartLoadWithRequest?.({
          url: 'https://example.com/help',
          isTopFrame: true,
        }),
      ).toBe(false);
      expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/help');
    });
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
