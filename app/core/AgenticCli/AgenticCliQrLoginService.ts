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
import {
  AGENTIC_CLI_MWP_CONNECTION_WAIT_MS,
  ENGINE_READY_POLL_MS,
  getCliDashboardTokenUrl,
  getDashboardWebviewUrl,
} from './agenticCliConfig';

interface CliDashboardTokenResponse {
  access_token?: unknown;
}

export interface HandleAgenticCliQrLoginParams {
  connReq: AgenticCliConnectionRequest;
  conn: Connection;
  setStage: (stage: string) => void;
  cleanupConnection: (conn: Connection) => Promise<void>;
}

const fetchCliDashboardAccessToken = async (
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

export async function waitForMwpClientConnected(
  conn: Connection,
  timeoutMs = AGENTIC_CLI_MWP_CONNECTION_WAIT_MS,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      finish(() => {
        reject(new Error('Timed out waiting for Agentic CLI MWP connection'));
      });
    }, timeoutMs);

    function finish(action: () => void): void {
      if (settled) {
        return;
      }
      settled = true;
      conn.client.off('connected', onConnected);
      clearTimeout(timeoutId);
      action();
    }

    function onConnected(): void {
      finish(resolve);
    }

    conn.client.on('connected', onConnected);
  });
}

export async function waitForKeyringUnlock(): Promise<void> {
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
        // Unlock may occur between the check above and subscribe; re-check
        // so we do not wait for a future lock/unlock cycle.
        if (Engine.context.KeyringController.isUnlocked()) {
          Engine.controllerMessenger.unsubscribe(
            'KeyringController:unlock',
            handler,
          );
          resolve();
        }
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, ENGINE_READY_POLL_MS));
    }
  }
}

export async function handleAgenticCliQrLogin({
  connReq,
  conn,
  setStage,
  cleanupConnection,
}: HandleAgenticCliQrLoginParams): Promise<void> {
  try {
    // --- Hydra bearer token ---
    setStage('get-hydra-token');
    const keyrings = Engine.context.KeyringController.state.keyrings;
    const entropySourceId =
      keyrings.find((keyring) => keyring.type === KeyringTypes.hd)?.metadata
        .id ?? keyrings[0]?.metadata.id;
    const hydraToken =
      await Engine.context.AuthenticationController.getBearerToken(
        entropySourceId,
      );

    // --- Dashboard session token (ignore QR override URLs) ---
    setStage('get-dashboard-token');
    const qrDashboardAuthUrl = connReq.connectionType?.dashboardAuthUrl;
    if (qrDashboardAuthUrl) {
      logger.warn('Ignoring QR-provided Agentic CLI dashboard auth URL', {
        dashboardAuthUrl: redactUrl(qrDashboardAuthUrl),
        configuredAuthUrl: redactUrl(getCliDashboardTokenUrl()),
      });
    }
    const dashboardAccessToken = await fetchCliDashboardAccessToken(hydraToken);

    // --- Dashboard WebView approval ---
    setStage('dashboard-webview');
    const dashboardWebviewUrl = getDashboardWebviewUrl();
    const qrDashboardUrl = connReq.connectionType?.dashboardUrl;
    if (qrDashboardUrl && qrDashboardUrl !== dashboardWebviewUrl) {
      logger.warn('Ignoring QR-provided Agentic CLI dashboard URL', {
        dashboardUrl: redactUrl(qrDashboardUrl),
        configuredDashboardUrl: dashboardWebviewUrl,
      });
    }
    const authToken = await AgenticCliDashboardWebviewService.open({
      dashboardUrl: dashboardWebviewUrl,
      dashboardToken: dashboardAccessToken,
    });

    // --- Send token to CLI ---
    setStage('send-auth-token-to-cli');
    await sendAuthTokenToClient(conn.client, conn.id, authToken);
    store.dispatch(
      showSimpleNotification({
        id: `${conn.id}-cli-link-success`,
        autodismiss: 3000,
        title: strings('sdk_connect_v2.show_cli_link_success.title'),
        status: 'success',
        description: strings(
          'sdk_connect_v2.show_cli_link_success.description',
        ),
      }),
    );
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
}
