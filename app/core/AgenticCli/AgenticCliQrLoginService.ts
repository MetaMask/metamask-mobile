import { SDK } from '@metamask/profile-sync-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { showSimpleNotification } from '../../actions/notification';
import Engine from '../Engine';
import { store } from '../../store';
import { strings } from '../../../locales/i18n';
import logger, { redactUrl } from '../SDKConnectV2/services/logger';
import { authEnv, devApiEnv, type DevApiEnv } from '../devApiEnv';
import { AgenticCliDashboardWebviewService } from '../../components/Views/AgenticCliDashboardWebview/AgenticCliDashboardWebviewService';
import { Connection } from '../SDKConnectV2/services/connection';
import { ConnectionRequest } from '../SDKConnectV2/types/connection-request';

const CLI_DASHBOARD_TOKEN_PATH = '/api/v2/mm-qr-login/token';
const ENGINE_READY_POLL_MS = 250;

const DASHBOARD_WEBVIEW_URL_BY_ENV: Record<DevApiEnv, string> = {
  dev: 'https://test-dashboard.web3auth.io/agentic/login',
  prod: 'https://dashboard.w3a.io/agentic/login',
};

const DEV_CLI_DASHBOARD_AUTH_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/,
  /^http:\/\/10\.0\.2\.2(?::\d+)?$/,
  /^http:\/\/localhost(?::\d+)?$/,
];

interface CliDashboardTokenResponse {
  access_token?: unknown;
}

interface HandleAgenticCliConnectionParams {
  connReq: ConnectionRequest;
  conn: Connection;
  setStage: (stage: string) => void;
  cleanupConnection: (conn: Connection) => Promise<void>;
}

const getDashboardWebviewUrl = (): string =>
  DASHBOARD_WEBVIEW_URL_BY_ENV[devApiEnv()];

const isDevCliDashboardAuthUrl = (dashboardAuthUrl: string): boolean => {
  try {
    const url = new URL(dashboardAuthUrl);
    return DEV_CLI_DASHBOARD_AUTH_ORIGIN_PATTERNS.some((pattern) =>
      pattern.test(`${url.protocol}//${url.host}`),
    );
  } catch {
    return false;
  }
};

const getCliDashboardTokenUrl = (dashboardAuthUrl?: string): string => {
  if (
    dashboardAuthUrl &&
    __DEV__ &&
    isDevCliDashboardAuthUrl(dashboardAuthUrl)
  ) {
    return dashboardAuthUrl;
  }

  const url = new URL(SDK.getEnvUrls(authEnv()).authApiUrl);
  url.pathname = CLI_DASHBOARD_TOKEN_PATH;
  return url.toString();
};

const getPrimaryEntropySourceId = (): string | undefined => {
  const keyrings = Engine.context.KeyringController.state.keyrings;
  return (
    keyrings.find((keyring) => keyring.type === KeyringTypes.hd)?.metadata.id ??
    keyrings[0]?.metadata.id
  );
};

const getCliDashboardAccessToken = async (
  hydraToken: string,
  dashboardAuthUrl?: string,
): Promise<string> => {
  const tokenUrl = getCliDashboardTokenUrl(dashboardAuthUrl);
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hydraToken}`,
    },
    body: '',
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to get CLI dashboard token: ${response.status} ${errorBody}`,
    );
  }

  const data = (await response.json()) as CliDashboardTokenResponse;

  if (typeof data.access_token !== 'string' || !data.access_token) {
    throw new Error('Failed to get CLI dashboard token: missing access_token');
  }

  return data.access_token;
};

const requestCliAuthToken = async (
  dashboardAccessToken: string,
  dashboardUrl?: string,
): Promise<string> => {
  const dashboardWebviewUrl = getDashboardWebviewUrl();

  if (dashboardUrl && dashboardUrl !== dashboardWebviewUrl) {
    logger.warn('Ignoring QR-provided Agentic CLI dashboard URL', {
      dashboardUrl: redactUrl(dashboardUrl),
      configuredDashboardUrl: dashboardWebviewUrl,
    });
  }

  return AgenticCliDashboardWebviewService.open({
    dashboardUrl: dashboardWebviewUrl,
    dashboardToken: dashboardAccessToken,
  });
};

const showCliLinkSuccess = (conn: Connection): void => {
  store.dispatch(
    showSimpleNotification({
      id: `${conn.id}-cli-link-success`,
      autodismiss: 3000,
      title: strings('sdk_connect_v2.show_cli_link_success.title'),
      status: 'success',
      description: strings('sdk_connect_v2.show_cli_link_success.description'),
    }),
  );
};

export const AgenticCliQrLoginService = {
  async waitForKeyringUnlock(): Promise<void> {
    while (true) {
      try {
        if (Engine.context.KeyringController.isUnlocked()) {
          return;
        }

        await new Promise<void>((resolve) => {
          const handler = () => {
            Engine.controllerMessenger.unsubscribe(
              'KeyringController:unlock',
              handler,
            );
            resolve();
          };
          Engine.controllerMessenger.subscribe(
            'KeyringController:unlock',
            handler,
          );
        });
        return;
      } catch {
        await new Promise((resolve) =>
          setTimeout(resolve, ENGINE_READY_POLL_MS),
        );
      }
    }
  },

  async handleConnection({
    connReq,
    conn,
    setStage,
    cleanupConnection,
  }: HandleAgenticCliConnectionParams): Promise<void> {
    try {
      const entropySourceId = getPrimaryEntropySourceId();
      setStage('get-hydra-token');
      const hydraToken =
        await Engine.context.AuthenticationController.getBearerToken(
          entropySourceId,
        );

      setStage('get-dashboard-token');
      const dashboardAccessToken = await getCliDashboardAccessToken(
        hydraToken,
        connReq.connectionType?.dashboardAuthUrl,
      );

      setStage('dashboard-webview');
      const authToken = await requestCliAuthToken(
        dashboardAccessToken,
        connReq.connectionType?.dashboardUrl,
      );

      setStage('send-auth-token-to-cli');
      await conn.sendAuthToken(authToken);
      showCliLinkSuccess(conn);
    } finally {
      try {
        await cleanupConnection(conn);
      } catch (error) {
        logger.error(
          'Failed to clean up temporary CLI connection:',
          conn.id,
          error,
        );
      }
    }
  },
};
