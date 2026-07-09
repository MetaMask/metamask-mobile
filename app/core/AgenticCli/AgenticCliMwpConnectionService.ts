import {
  DEFAULT_SESSION_TTL,
  type IKeyManager,
} from '@metamask/mobile-wallet-protocol-core';
import { rpcErrors } from '@metamask/rpc-errors';
import { INTERNAL_ORIGINS } from '../../constants/transaction';
import { TransportType } from '../../components/hooks/useAnalytics/useAnalytics.types';
import Logger from '../../util/Logger';
import { parseMwpConnectPayload } from '../SDKConnectV2/utils/parseMwpConnectDeeplink';
import { trackMwpEvent } from '../SDKConnectV2/utils/trackMwpEvent';
import { Connection } from '../SDKConnectV2/services/connection';
import logger, { redactUrl } from '../SDKConnectV2/services/logger';
import { ConnectionInfo } from '../SDKConnectV2/types/connection-info';
import { IHostApplicationAdapter } from '../SDKConnectV2/types/host-application-adapter';
import { AGENTIC_CLI_CONNECTION_LOADING_AUTODISMISS_MS } from '../SDKConnectV2/adapters/host-application-adapter';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import {
  hideAgenticCliOtpCode,
  showAgenticCliOtpCode,
} from './agenticCliOtpUi';
import {
  type AgenticCliConnectionRequest,
  isAgenticCliConnectionRequest,
  isAgenticCliLoginOperation,
} from './agenticCliConnectionRequest';
import {
  clearAgenticCliLoginConnectionEstablished,
  markAgenticCliLoginConnectionEstablished,
} from './agenticCliConnectionSession';
import {
  createMwpClientConnectedWaiter,
  handleAgenticCliQrLogin,
  waitForKeyringUnlock,
} from './AgenticCliQrLoginService';

export interface AgenticCliMwpConnectionDeps {
  relayURL: string;
  keymanager: IKeyManager;
  hostapp: IHostApplicationAdapter;
  getConnection: (id: string) => Connection | undefined;
  cleanupConnection: (conn: Connection) => Promise<void>;
}

const mwpAnalyticsFromRequest = (connReq: AgenticCliConnectionRequest) => ({
  remote_session_id:
    connReq.metadata.analytics?.remote_session_id ?? connReq.sessionRequest.id,
  transport_type: TransportType.MWP,
  sdk_version: connReq.metadata.sdk.version,
  sdk_platform: connReq.metadata.sdk.platform,
  dapp_name: connReq.metadata.dapp.name,
  dapp_url: connReq.metadata.dapp.url,
});

export function tryParseAgenticCliConnectionRequest(
  url: unknown,
): AgenticCliConnectionRequest | null {
  if (typeof url !== 'string') {
    return null;
  }

  try {
    const raw = parseMwpConnectPayload(url);
    return isAgenticCliConnectionRequest(raw) ? raw : null;
  } catch {
    return null;
  }
}

const parseAgenticCliConnectionRequest = (
  url: string,
): AgenticCliConnectionRequest => {
  const parsed = tryParseAgenticCliConnectionRequest(url);

  if (!parsed) {
    throw new Error('Invalid agentic CLI connection request structure.');
  }

  return parsed;
};

const wireAgenticCliClientEvents = (conn: Connection): void => {
  conn.client.on('display_otp', (otp, deadline) => {
    showAgenticCliOtpCode(conn.info, otp, deadline);
  });

  conn.client.on('connected', () => {
    hideAgenticCliOtpCode(conn.info);
  });
};

export function isAgenticCliDeeplink(url: unknown): url is string {
  return tryParseAgenticCliConnectionRequest(url) !== null;
}

export async function handleAgenticCliConnectDeeplink(
  url: string,
  deps: AgenticCliMwpConnectionDeps,
  preParsedConnReq?: AgenticCliConnectionRequest,
): Promise<void> {
  logger.debug('Handling agentic CLI connect deeplink:', redactUrl(url));

  let conn: Connection | undefined;
  let connInfo: ConnectionInfo | undefined;
  let connReq: AgenticCliConnectionRequest | undefined;
  let agenticCliStage: string | undefined;

  try {
    // --- Parse and validate request ---
    agenticCliStage = 'parse-connection-request';
    connReq = preParsedConnReq ?? parseAgenticCliConnectionRequest(url);

    trackMwpEvent(
      MetaMetricsEvents.REMOTE_CONNECTION_REQUEST_RECEIVED,
      mwpAnalyticsFromRequest(connReq),
    );

    if (
      INTERNAL_ORIGINS.includes(connReq.metadata.dapp.url) ||
      INTERNAL_ORIGINS.includes(connReq.metadata.dapp.name)
    ) {
      throw rpcErrors.invalidParams({
        message: 'External transactions cannot use internal origins',
      });
    }

    // --- Wait for keyring unlock ---
    agenticCliStage = 'wait-for-keyring-unlock';
    await waitForKeyringUnlock();

    connInfo = {
      id: connReq.sessionRequest.id,
      metadata: connReq.metadata,
      expiresAt: Date.now() + DEFAULT_SESSION_TTL,
    };

    const existingConnection = deps.getConnection(connInfo.id);

    if (existingConnection) {
      logger.debug(
        'Already have a connection with this id, reusing for agentic CLI login',
        redactUrl(url),
      );
      conn = existingConnection;
      agenticCliStage = 'mwp-connect-existing';
    } else {
      deps.hostapp.showConnectionLoading(connInfo, {
        autodismissMs: AGENTIC_CLI_CONNECTION_LOADING_AUTODISMISS_MS,
      });
      agenticCliStage = 'create-mwp-connection';
      conn = await Connection.create(
        connInfo,
        deps.keymanager,
        deps.relayURL,
        deps.hostapp,
      );
      wireAgenticCliClientEvents(conn);

      agenticCliStage = 'mwp-connect';
      const { promise: connectedPromise, cancel: cancelConnectedWait } =
        createMwpClientConnectedWaiter(conn);
      try {
        await conn.connect({
          ...connReq.sessionRequest,
          mode: 'untrusted',
        });
        await connectedPromise;
      } catch (error) {
        cancelConnectedWait();
        await connectedPromise.catch(() => undefined);
        throw error;
      }
    }

    if (!isAgenticCliLoginOperation(connReq.connectionType.operationType)) {
      logger.debug(
        'Agentic CLI connection established without login flow',
        conn.id,
      );
      return;
    }

    markAgenticCliLoginConnectionEstablished();

    // --- QR login: Hydra → dashboard → WebView → auth token ---
    try {
      await handleAgenticCliQrLogin({
        connReq,
        conn,
        setStage: (stage) => {
          agenticCliStage = stage;
        },
        cleanupConnection: deps.cleanupConnection,
      });
    } finally {
      clearAgenticCliLoginConnectionEstablished();
      conn = undefined;
    }

    logger.debug('Handled agentic CLI connect deeplink.', connInfo.id);
  } catch (error) {
    Logger.error(error as Error, {
      tags: {
        feature: 'mm-connect',
        operation: 'handle_connect_deeplink',
      },
      context: {
        name: 'mwp_deeplink',
        data: {
          url: redactUrl(url),
          agentic_cli_stage: agenticCliStage,
          dapp_url: connReq?.metadata?.dapp?.url,
          dapp_name: connReq?.metadata?.dapp?.name,
          sdk_version: connReq?.metadata?.sdk?.version,
          sdk_platform: connReq?.metadata?.sdk?.platform,
        },
      },
    });
    logger.error('Failed to handle agentic CLI connect deeplink:', error, {
      agenticCliStage,
      url: redactUrl(url),
    });
    deps.hostapp.showConnectionError();

    trackMwpEvent(MetaMetricsEvents.REMOTE_CONNECTION_REQUEST_FAILED, {
      ...(connReq ? mwpAnalyticsFromRequest(connReq) : {}),
      remote_session_id:
        connReq?.metadata.analytics?.remote_session_id ??
        connReq?.sessionRequest?.id ??
        'unknown',
      transport_type: TransportType.MWP,
      sdk_version: connReq?.metadata?.sdk?.version,
      sdk_platform: connReq?.metadata?.sdk?.platform,
      dapp_name: connReq?.metadata?.dapp?.name,
      dapp_url: connReq?.metadata?.dapp?.url,
      failure_reason: error instanceof Error ? error.message : String(error),
    });

    if (conn) {
      clearAgenticCliLoginConnectionEstablished();
      try {
        await deps.cleanupConnection(conn);
      } catch (cleanupError) {
        logger.error(
          'Failed to clean up failed agentic CLI connection:',
          conn.id,
          cleanupError,
        );
      }
    }
  } finally {
    if (connInfo) {
      deps.hostapp.hideConnectionLoading(connInfo);
      hideAgenticCliOtpCode(connInfo);
    }
  }
}
