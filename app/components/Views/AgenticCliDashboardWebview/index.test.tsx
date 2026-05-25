import React from 'react';
import { Linking, Platform } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import AgenticCliDashboardWebview from './index';
import { AgenticCliDashboardWebviewService } from './AgenticCliDashboardWebviewService';
import Logger from '../../../util/Logger';

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockUseParams = jest.fn();
const mockBuildWebViewUrl =
  AgenticCliDashboardWebviewService.buildWebViewUrl as jest.Mock;
const mockParseEvent =
  AgenticCliDashboardWebviewService.parseEvent as jest.Mock;
const mockShouldLoadInWebView =
  AgenticCliDashboardWebviewService.shouldLoadInWebView as jest.Mock;
const mockResolve = AgenticCliDashboardWebviewService.resolve as jest.Mock;
const mockReject = AgenticCliDashboardWebviewService.reject as jest.Mock;

jest.mock('./AgenticCliDashboardWebviewService', () => ({
  AgenticCliDashboardWebviewService: {
    buildWebViewUrl: jest.fn(),
    parseEvent: jest.fn(),
    shouldLoadInWebView: jest.fn(),
    resolve: jest.fn(),
    reject: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
}));

jest.mock(
  '../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions',
  () => (options: unknown) => options,
);

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => {
    const { View } = jest.requireActual('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: unknown[]) => args,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Button: ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress: () => void;
  }) => {
    const { Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <TouchableOpacity testID="dashboard-close-button" onPress={onPress}>
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  },
  ButtonSize: { Md: 'Md' },
  ButtonVariant: { Primary: 'Primary' },
  FontWeight: { Regular: 'Regular' },
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{children}</Text>;
  },
  TextVariant: { BodyMd: 'BodyMd' },
}));

const mockWebViewProps = jest.fn();
jest.mock('@metamask/react-native-webview', () => ({
  WebView: jest.requireActual('react').forwardRef((props, _ref) => {
    const { View } = jest.requireActual('react-native');
    mockWebViewProps(props);
    return <View testID="agentic-dashboard-webview" />;
  }),
}));

const getLatestWebViewProps = () => {
  const props = mockWebViewProps.mock.calls.at(-1)?.[0];

  if (!props) {
    throw new Error('WebView props were not captured');
  }

  return props;
};

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'sdk_connect_v2.agentic_cli_dashboard_webview.title': 'Select project',
      'sdk_connect_v2.agentic_cli_dashboard_webview.load_error':
        'Unable to load approval page.',
      'sdk_connect_v2.agentic_cli_dashboard_webview.closed_error':
        'Dashboard approval closed.',
      'navigation.close': 'Close',
    };
    return translations[key] ?? key;
  },
}));

describe('AgenticCliDashboardWebview', () => {
  const params = {
    requestId: 'request-1',
    dashboardUrl: 'https://test-dashboard.web3auth.io/agentic/login',
    dashboardToken: 'dashboard-token',
  };

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockUseParams.mockReturnValue(params);
    mockBuildWebViewUrl.mockReturnValue(
      'https://test-dashboard.web3auth.io/agentic/login#auth_token=dashboard-token',
    );
    mockShouldLoadInWebView.mockReturnValue(false);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('renders the dashboard WebView with hash-token URL and Authorization header', async () => {
    const { getByTestId, unmount } = render(<AgenticCliDashboardWebview />);

    await waitFor(() =>
      expect(getByTestId('agentic-dashboard-webview')).toBeTruthy(),
    );

    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Select project' }),
    );
    expect(mockWebViewProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: {
          uri: 'https://test-dashboard.web3auth.io/agentic/login#auth_token=dashboard-token',
          headers: { Authorization: 'Bearer dashboard-token' },
        },
      }),
    );
    unmount();
  });

  it('resolves and closes when the dashboard posts an approved message', async () => {
    render(<AgenticCliDashboardWebview />);
    await waitFor(() => expect(mockWebViewProps).toHaveBeenCalled());
    mockParseEvent.mockReturnValue({ type: 'approved', cliToken: 'cli-token' });

    expect(getLatestWebViewProps().onMessage).toEqual(expect.any(Function));
    act(() => {
      getLatestWebViewProps().onMessage({
        nativeEvent: { data: 'message' },
      });
    });

    expect(mockParseEvent).toHaveBeenCalledWith('message');
    await waitFor(() =>
      expect(mockResolve).toHaveBeenCalledWith('request-1', 'cli-token'),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('rejects and closes when the dashboard posts close', async () => {
    render(<AgenticCliDashboardWebview />);
    await waitFor(() => expect(mockWebViewProps).toHaveBeenCalled());
    mockParseEvent.mockReturnValue({
      type: 'close',
      message: 'WebView closed',
    });

    act(() => {
      getLatestWebViewProps().onMessage({
        nativeEvent: { data: 'message' },
      });
    });

    await waitFor(() =>
      expect(mockReject).toHaveBeenCalledWith(
        'request-1',
        expect.objectContaining({ message: 'Dashboard approval closed.' }),
      ),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders load errors and rejects the pending request', async () => {
    render(<AgenticCliDashboardWebview />);
    await waitFor(() => expect(mockWebViewProps).toHaveBeenCalled());

    act(() => {
      getLatestWebViewProps().onError({
        nativeEvent: {
          code: -1,
          description: 'network failed',
          domain: 'NSURLErrorDomain',
          url: `${params.dashboardUrl}#auth_token=secret`,
        },
      });
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'network failed' }),
      expect.objectContaining({
        url: `${params.dashboardUrl}#auth_token=[REDACTED]`,
      }),
    );
    await waitFor(() =>
      expect(mockReject).toHaveBeenCalledWith(
        'request-1',
        expect.objectContaining({ message: 'Unable to load approval page.' }),
      ),
    );
  });

  it('opens top-frame external links on Android even when navigationType is other', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(<AgenticCliDashboardWebview />);
    await waitFor(() => expect(mockWebViewProps).toHaveBeenCalled());

    const shouldLoad = getLatestWebViewProps().onShouldStartLoadWithRequest({
      url: 'https://external.example/path',
      isTopFrame: true,
      navigationType: 'other',
    });

    expect(shouldLoad).toBe(false);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://external.example/path',
    );
  });

  it('allows non-top-frame external loads inside the WebView', async () => {
    render(<AgenticCliDashboardWebview />);
    await waitFor(() => expect(mockWebViewProps).toHaveBeenCalled());

    const shouldLoad = getLatestWebViewProps().onShouldStartLoadWithRequest({
      url: 'https://external.example/frame',
      isTopFrame: false,
      navigationType: 'other',
    });

    expect(shouldLoad).toBe(true);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
