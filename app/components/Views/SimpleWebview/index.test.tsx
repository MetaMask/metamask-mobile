import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import SimpleWebview from './';
import { useNavigation, useRoute } from '@react-navigation/native';
import Share from 'react-native-share';
import Logger from '../../../util/Logger';
import { getHardwareTier } from '../../../util/deviceCapability';
import { useNetworkTier } from '../../../hooks/useNetworkTier';
import {
  attachWebviewAuthSessionClose,
  dismissWebviewAuthSession,
  handleWebviewAuthRedirect,
} from '../../../util/webviewAuthSession';

jest.mock('../../../util/webviewAuthSession', () => ({
  attachWebviewAuthSessionClose: jest.fn(() => true),
  dismissWebviewAuthSession: jest.fn(),
  handleWebviewAuthRedirect: jest.fn(() => false),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

jest.mock('../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

const mockRouteParams = (params: Record<string, unknown> = {}) => {
  (useRoute as jest.Mock).mockReturnValue({
    params: { url: 'https://etherscan.io', ...params },
  });
};

describe('SimpleWebview', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (Share.open as jest.Mock).mockImplementation(() => Promise.resolve());
    jest.mocked(getHardwareTier).mockReturnValue('HIGH');
    jest.mocked(useNetworkTier).mockReturnValue('WIFI');
    mockRouteParams();
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  it('renders HeaderStandard with back and share actions', () => {
    const { getByTestId } = render(<SimpleWebview />);

    expect(getByTestId('simple-webview-back-button')).toBeOnTheScreen();
    expect(getByTestId('simple-webview-share-button')).toBeOnTheScreen();
  });

  it('renders a drag handle and close button when useGlassHeader is set', () => {
    mockRouteParams({ useGlassHeader: true });

    const { getByTestId, queryByTestId } = render(<SimpleWebview />);

    expect(getByTestId('simple-webview-drag-handle')).toBeOnTheScreen();
    expect(getByTestId('simple-webview-close-button')).toBeOnTheScreen();
    expect(queryByTestId('simple-webview-back-button')).toBeNull();
  });

  it('renders a plain close header on low-RAM devices', () => {
    jest.mocked(getHardwareTier).mockReturnValue('LOW');
    mockRouteParams({ useGlassHeader: true });

    const { getByTestId, queryByTestId } = render(<SimpleWebview />);

    expect(getByTestId('simple-webview-drag-handle')).toBeOnTheScreen();
    expect(getByTestId('simple-webview-close-button')).toBeOnTheScreen();
    expect(queryByTestId('simple-webview-back-button')).toBeNull();
  });

  it('renders a plain close header when the device is offline', () => {
    jest.mocked(useNetworkTier).mockReturnValue('NONE');
    mockRouteParams({ useGlassHeader: true });

    const { getByTestId } = render(<SimpleWebview />);

    expect(getByTestId('simple-webview-drag-handle')).toBeOnTheScreen();
    expect(getByTestId('simple-webview-close-button')).toBeOnTheScreen();
  });

  it('hides the share button when hideShareButton is true', () => {
    mockRouteParams({ hideShareButton: true });

    const { getByTestId, queryByTestId } = render(<SimpleWebview />);

    expect(getByTestId('simple-webview-back-button')).toBeOnTheScreen();
    expect(queryByTestId('simple-webview-share-button')).toBeNull();
  });

  it('includes the top inset when not presented as a modal', () => {
    const { UNSAFE_getByType } = render(<SimpleWebview />);

    expect(UNSAFE_getByType(HeaderStandard).props.includesTopInset).toBe(true);
  });

  it('omits the top inset when presented as a modal on iOS', () => {
    Platform.OS = 'ios';
    mockRouteParams({ isModal: true });

    const { UNSAFE_getByType } = render(<SimpleWebview />);

    expect(UNSAFE_getByType(HeaderStandard).props.includesTopInset).toBe(false);
  });

  it('includes the top inset when presented as a modal on Android', () => {
    Platform.OS = 'android';
    mockRouteParams({ isModal: true });

    const { UNSAFE_getByType } = render(<SimpleWebview />);

    expect(UNSAFE_getByType(HeaderStandard).props.includesTopInset).toBe(true);
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByTestId } = render(<SimpleWebview />);
    fireEvent.press(getByTestId('simple-webview-back-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls Share.open when share button is pressed', () => {
    const { getByTestId } = render(<SimpleWebview />);
    fireEvent.press(getByTestId('simple-webview-share-button'));

    expect(Share.open).toHaveBeenCalledWith({ url: 'https://etherscan.io' });
  });

  it('logs error when share fails', async () => {
    const log = jest.spyOn(Logger, 'log');
    (Share.open as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    const { getByTestId } = render(<SimpleWebview />);
    fireEvent.press(getByTestId('simple-webview-share-button'));

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        'Error while trying to share simple web view',
        expect.any(Error),
      );
    });
  });

  it('allows http, https, about:blank, and about:srcdoc for Cloudflare Turnstile', () => {
    const { getByTestId } = render(<SimpleWebview />);

    expect(getByTestId('simple-webview').props.originWhitelist).toEqual([
      'https://*',
      'http://*',
      'about:blank',
      'about:srcdoc',
    ]);
  });

  describe('authSessionId mode', () => {
    it('enables domStorage, intercepts matching redirects, and closes the screen', () => {
      mockRouteParams({
        url: 'https://x.com/i/oauth2/authorize',
        authSessionId: 'session-1',
      });
      jest
        .mocked(handleWebviewAuthRedirect)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => true);

      const { getByTestId } = render(<SimpleWebview />);
      const webView = getByTestId('simple-webview');

      expect(webView.props.domStorageEnabled).toBe(true);
      expect(attachWebviewAuthSessionClose).toHaveBeenCalledWith(
        'session-1',
        expect.any(Function),
      );

      expect(
        webView.props.onShouldStartLoadWithRequest({
          url: 'https://x.com/login',
        }),
      ).toBe(true);
      expect(mockGoBack).not.toHaveBeenCalled();

      expect(
        webView.props.onShouldStartLoadWithRequest({
          url: 'https://link.metamask.io/x-oauth-redirect?code=abc&state=xyz',
        }),
      ).toBe(false);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('blocks repeated redirect requests while closing without calling goBack twice', () => {
      mockRouteParams({
        url: 'https://x.com/i/oauth2/authorize',
        authSessionId: 'session-repeat',
      });
      jest
        .mocked(handleWebviewAuthRedirect)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const { getByTestId } = render(<SimpleWebview />);
      const webView = getByTestId('simple-webview');
      const redirectUrl =
        'https://link.metamask.io/x-oauth-redirect?code=abc&state=xyz';

      expect(
        webView.props.onShouldStartLoadWithRequest({ url: redirectUrl }),
      ).toBe(false);
      expect(
        webView.props.onShouldStartLoadWithRequest({ url: redirectUrl }),
      ).toBe(false);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('closes on navigation state change when redirect matches', () => {
      mockRouteParams({ authSessionId: 'session-2' });
      jest.mocked(handleWebviewAuthRedirect).mockReturnValueOnce(true);

      const { getByTestId } = render(<SimpleWebview />);
      const webView = getByTestId('simple-webview');
      const redirectUrl =
        'https://link.metamask.io/x-oauth-redirect?code=abc&state=xyz';

      webView.props.onNavigationStateChange({ url: redirectUrl });

      expect(handleWebviewAuthRedirect).toHaveBeenCalledWith(
        'session-2',
        redirectUrl,
      );
      expect(
        webView.props.onShouldStartLoadWithRequest({ url: redirectUrl }),
      ).toBe(false);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('dismisses the auth session when unmounted', () => {
      mockRouteParams({ authSessionId: 'session-3' });

      const { unmount } = render(<SimpleWebview />);
      unmount();

      expect(dismissWebviewAuthSession).toHaveBeenCalledWith('session-3');
    });

    it('closes immediately, blocks loads, and cleans up when the auth session already ended before mount', () => {
      mockRouteParams({ authSessionId: 'stale-session' });
      jest.mocked(attachWebviewAuthSessionClose).mockReturnValueOnce(false);

      const { getByTestId, unmount } = render(<SimpleWebview />);
      const webView = getByTestId('simple-webview');

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(
        webView.props.onShouldStartLoadWithRequest({
          url: 'https://link.metamask.io/x-oauth-redirect?code=abc&state=xyz',
        }),
      ).toBe(false);

      unmount();

      expect(dismissWebviewAuthSession).toHaveBeenCalledWith('stale-session');
    });

    it('blocks subsequent loads after closing via header close button', () => {
      mockRouteParams({
        useGlassHeader: true,
        authSessionId: 'session-close',
      });

      const { getByTestId } = render(<SimpleWebview />);
      const webView = getByTestId('simple-webview');

      fireEvent.press(getByTestId('simple-webview-close-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(
        webView.props.onShouldStartLoadWithRequest({
          url: 'https://link.metamask.io/x-oauth-redirect?code=abc&state=xyz',
        }),
      ).toBe(false);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
