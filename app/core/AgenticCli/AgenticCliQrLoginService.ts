import { SDK } from '@metamask/profile-sync-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { showSimpleNotification } from '../../actions/notification';
import Engine from '../Engine';
import { store } from '../../store';
import { strings } from '../../../locales/i18n';
import logger, { redactUrl } from '../SDKConnectV2/services/logger';
import { AgenticCliDashboardWebviewService } from '../../components/Views/AgenticCliDashboardWebview/AgenticCliDashboardWebviewService';
import { Connection } from '../SDKConnectV2/services/connection';
import type { AgenticCliConnectionRequest } from './agenticCliConnectionRequest';
import { sendAuthTokenToClient } from './sendAuthToken';
import { getBuildType } from '../OAuthService/OAuthLoginHandlers/constants';
import { authEnv } from '../devApiEnv';

const CLI_DASHBOARD_TOKEN_PATH = '/api/v2/mm-qr-login/token';
const ENGINE_READY_POLL_MS = 250;

const DASHBOARD_WEBVIEW_URL_BY_ENV: Record<string, string> = {
  main_dev: 'https://test-dashboard.web3auth.io/agentic/login',
  main_uat: 'https://dev-dashboard.web3auth.io/agentic/login',
  main_prod: 'https://dashboard.w3a.io/agentic/login',
  flask_dev: 'https://test-dashboard.web3auth.io/agentic/login',
  flask_uat: 'https://dev-dashboard.web3auth.io/agentic/login',
  flask_prod: 'https://dashboard.w3a.io/agentic/login',
};

interface CliDashboardTokenResponse {
  access_token?: unknown;
}

interface HandleAgenticCliConnectionParams {
  connReq: AgenticCliConnectionRequest;
  conn: Connection;
  setStage: (stage: string) => void;
  cleanupConnection: (conn: Connection) => Promise<void>;
}

const getDashboardWebviewUrl = (): string => {
  const buildType = getBuildType();
  return (
    DASHBOARD_WEBVIEW_URL_BY_ENV[buildType] ??
    DASHBOARD_WEBVIEW_URL_BY_ENV.main_prod
  );
};

const getCliDashboardTokenUrl = (): string => {
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
): Promise<string> => {
  const tokenUrl = getCliDashboardTokenUrl();
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
      const qrDashboardAuthUrl = connReq.connectionType?.dashboardAuthUrl;
      if (qrDashboardAuthUrl) {
        logger.warn('Ignoring QR-provided Agentic CLI dashboard auth URL', {
          dashboardAuthUrl: redactUrl(qrDashboardAuthUrl),
          configuredAuthUrl: redactUrl(getCliDashboardTokenUrl()),
        });
      }
      const dashboardAccessToken = await getCliDashboardAccessToken(hydraToken);

      setStage('dashboard-webview');
      const authToken = await requestCliAuthToken(
        dashboardAccessToken,
        connReq.connectionType?.dashboardUrl,
      );

      setStage('send-auth-token-to-cli');
      await sendAuthTokenToClient(conn.client, conn.id, authToken);
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
