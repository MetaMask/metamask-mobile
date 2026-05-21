import NavigationService from '../../../core/NavigationService';
import Routes from '../../../constants/navigation/Routes';
import { AgenticCliDashboardWebviewService } from './AgenticCliDashboardWebviewService';

jest.mock('../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

describe('AgenticCliDashboardWebviewService', () => {
  const dashboardParams = {
    dashboardUrl: 'https://test-dashboard.web3auth.io/agentic/auth',
    dashboardToken: 'dashboard-token',
  };

  const navigateMock = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.useRealTimers();
    navigateMock.mockReset();
  });

  describe('buildWebViewUrl', () => {
    it('passes the dashboard auth token as a hash param', () => {
      const webViewUrl = AgenticCliDashboardWebviewService.buildWebViewUrl(
        'https://test-dashboard.web3auth.io/agentic/auth?foo=bar',
        'dashboard-token',
      );

      expect(webViewUrl).toBe(
        'https://test-dashboard.web3auth.io/agentic/auth?foo=bar#auth_token=dashboard-token',
      );
    });

    it('removes stale query auth token when building the WebView URL', () => {
      const webViewUrl = AgenticCliDashboardWebviewService.buildWebViewUrl(
        'https://test-dashboard.web3auth.io/agentic/auth?auth_token=old-token',
        'dashboard-token',
      );

      expect(webViewUrl).toBe(
        'https://test-dashboard.web3auth.io/agentic/auth#auth_token=dashboard-token',
      );
    });

    it('throws when dashboard origin is not allowlisted', () => {
      expect(() =>
        AgenticCliDashboardWebviewService.buildWebViewUrl(
          'https://evil.example/agentic/auth',
          'dashboard-token',
        ),
      ).toThrow('Dashboard origin is not allowed');
    });
  });

  describe('parseEvent', () => {
    it('ignores non-string, oversized, malformed, and untrusted events', () => {
      expect(AgenticCliDashboardWebviewService.parseEvent(null)).toBeNull();
      expect(
        AgenticCliDashboardWebviewService.parseEvent('x'.repeat(16 * 1024 + 1)),
      ).toBeNull();
      expect(AgenticCliDashboardWebviewService.parseEvent('{}')).toBeNull();
      expect(
        AgenticCliDashboardWebviewService.parseEvent(
          JSON.stringify({
            source: 'unexpected-source',
            type: 'approved',
            token: 'cli-token',
          }),
        ),
      ).toBeNull();
    });

    it('parses raw string CLI token messages', () => {
      expect(
        AgenticCliDashboardWebviewService.parseEvent('cli-token'),
      ).toStrictEqual({
        type: 'approved',
        cliToken: 'cli-token',
      });
    });

    it('parses the deployed dashboard CLI_AUTH_TOKEN payload', () => {
      expect(
        AgenticCliDashboardWebviewService.parseEvent(
          JSON.stringify({
            type: 'CLI_AUTH_TOKEN',
            payload: {
              access_token: 'cli-access-token',
              refresh_token: 'cli-refresh-token',
              expires_in: 3600,
              token_type: 'Bearer',
            },
          }),
        ),
      ).toStrictEqual({
        type: 'approved',
        cliToken: 'cli-access-token:cli-refresh-token',
      });
    });

    it('parses the dashboard approved payload with mobile source', () => {
      expect(
        AgenticCliDashboardWebviewService.parseEvent(
          JSON.stringify({
            source: 'mm-agentic-cli',
            type: 'approved',
            payload: {
              access_token: 'cli-access-token',
              refresh_token: 'cli-refresh-token',
            },
          }),
        ),
      ).toStrictEqual({
        type: 'approved',
        cliToken: 'cli-access-token:cli-refresh-token',
      });
    });

    it('parses top-level dashboard CLI token pairs', () => {
      expect(
        AgenticCliDashboardWebviewService.parseEvent(
          JSON.stringify({
            source: 'mm-agentic-cli',
            type: 'approved',
            access_token: 'cli-access-token',
            refresh_token: 'cli-refresh-token',
          }),
        ),
      ).toStrictEqual({
        type: 'approved',
        cliToken: 'cli-access-token:cli-refresh-token',
      });
    });

    it('parses the mobile MFA approved payload', () => {
      expect(
        AgenticCliDashboardWebviewService.parseEvent(
          JSON.stringify({
            source: 'mm-agentic-cli',
            type: 'approved',
            cli_token: 'cli-token',
          }),
        ),
      ).toStrictEqual({
        type: 'approved',
        cliToken: 'cli-token',
      });
    });

    it('parses rejected, close, and error events', () => {
      expect(
        AgenticCliDashboardWebviewService.parseEvent(
          JSON.stringify({ type: 'reject', message: 'Nope' }),
        ),
      ).toStrictEqual({ type: 'rejected', message: 'Nope' });

      expect(
        AgenticCliDashboardWebviewService.parseEvent(
          JSON.stringify({ type: 'close' }),
        ),
      ).toStrictEqual({ type: 'close', message: 'WebView closed' });

      expect(
        AgenticCliDashboardWebviewService.parseEvent(
          JSON.stringify({ type: 'error', message: 'Failed' }),
        ),
      ).toStrictEqual({ type: 'error', message: 'Failed' });
    });
  });

  describe('navigation helpers', () => {
    it('allows configured dashboard origins and blocks invalid URLs', () => {
      expect(
        AgenticCliDashboardWebviewService.isOriginAllowed(
          'https://dashboard.w3a.io',
        ),
      ).toBe(true);
      expect(
        AgenticCliDashboardWebviewService.shouldLoadInWebView(
          'https://test-dashboard.web3auth.io/agentic/auth#auth_token=token',
        ),
      ).toBe(true);
      expect(
        AgenticCliDashboardWebviewService.shouldLoadInWebView('not-a-url'),
      ).toBe(false);
    });

    it('resolves an open request when the WebView posts a CLI token', async () => {
      const promise = AgenticCliDashboardWebviewService.open(dashboardParams);
      const requestId = navigateMock.mock.calls[0][1].requestId;

      expect(navigateMock).toHaveBeenCalledWith(
        Routes.AGENTIC_CLI_DASHBOARD_WEBVIEW.CONFIRM,
        {
          ...dashboardParams,
          requestId,
        },
      );

      AgenticCliDashboardWebviewService.resolve(requestId, 'cli-token');

      await expect(promise).resolves.toBe('cli-token');
    });

    it('rejects an open request when the WebView fails', async () => {
      const promise = AgenticCliDashboardWebviewService.open(dashboardParams);
      const requestId = navigateMock.mock.calls[0][1].requestId;

      AgenticCliDashboardWebviewService.reject(
        requestId,
        new Error('WebView closed'),
      );

      await expect(promise).rejects.toThrow('WebView closed');
    });

    it('rejects an open request when navigation throws', async () => {
      navigateMock.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });

      await expect(
        AgenticCliDashboardWebviewService.open(dashboardParams),
      ).rejects.toThrow('Navigation failed');
    });

    it('rejects an open request when the WebView times out', async () => {
      jest.useFakeTimers();

      const promise = AgenticCliDashboardWebviewService.open(dashboardParams);

      jest.advanceTimersByTime(5 * 60 * 1000);

      await expect(promise).rejects.toThrow('Dashboard approval timed out.');
    });
  });
});
