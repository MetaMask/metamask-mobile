import { AgenticCliDashboardWebviewService } from './AgenticCliDashboardWebviewService';

describe('AgenticCliDashboardWebviewService', () => {
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
  });

  describe('parseEvent', () => {
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
        cliToken: 'cli-access-token',
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
  });
});
