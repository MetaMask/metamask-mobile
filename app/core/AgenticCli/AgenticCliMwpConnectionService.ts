import {
  DEFAULT_SESSION_TTL,
  type IKeyManager,
  type SessionRequest,
} from '@metamask/mobile-wallet-protocol-core';
import { rpcErrors } from '@metamask/rpc-errors';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { INTERNAL_ORIGINS } from '../../constants/transaction';
import { TransportType } from '../../components/hooks/useAnalytics/useAnalytics.types';
import Logger from '../../util/Logger';
import { parseMwpConnectPayload } from '../mwp/parseMwpConnectDeeplink';
import { Connection } from '../SDKConnectV2/services/connection';
import logger, { redactUrl } from '../SDKConnectV2/services/logger';
import { ConnectionInfo } from '../SDKConnectV2/types/connection-info';
import { IHostApplicationAdapter } from '../SDKConnectV2/types/host-application-adapter';
import type { IMetaMetricsEvent } from '../Analytics/MetaMetrics.types';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import {
  hideAgenticCliConnectionLoading,
  showAgenticCliConnectionLoading,
} from './agenticCliLoading';
import {
  hideAgenticCliOtpCode,
  showAgenticCliOtpCode,
} from './agenticCliOtpUi';
import {
  type AgenticCliConnectionRequest,
  isAgenticCliConnectionRequest,
} from './agenticCliConnectionRequest';
import { AgenticCliQrLoginService } from './AgenticCliQrLoginService';

function trackMwpEvent(
  event: IMetaMetricsEvent,
  properties: Record<string, unknown>,
): void {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
    );
  } catch {
    // Intentionally swallowed: analytics must not block MWP flows.
  }
}

export interface AgenticCliMwpConnectionDeps {
  relayURL: string;
  keymanager: IKeyManager;
  hostapp: IHostApplicationAdapter;
  hasConnection: (id: string) => boolean;
  cleanupConnection: (conn: Connection) => Promise<void>;
}

const parseAgenticCliConnectionRequest = (
  url: string,
): AgenticCliConnectionRequest => {
  const raw = parseMwpConnectPayload(url);

  if (!isAgenticCliConnectionRequest(raw)) {
    throw new Error('Invalid agentic CLI connection request structure.');
  }

  return raw;
};

const toConnectionInfo = (
  connReq: AgenticCliConnectionRequest,
): ConnectionInfo => ({
  id: connReq.sessionRequest.id,
  metadata: connReq.metadata,
  expiresAt: Date.now() + DEFAULT_SESSION_TTL,
});

const toUntrustedSessionRequest = (
  connReq: AgenticCliConnectionRequest,
): SessionRequest => ({
  ...connReq.sessionRequest,
  mode: 'untrusted',
});

const wireAgenticCliClientEvents = (conn: Connection): void => {
  conn.client.on('display_otp', (otp, deadline) => {
    showAgenticCliOtpCode(conn.info, otp, deadline);
  });

  conn.client.on('connected', () => {
    hideAgenticCliOtpCode(conn.info);
  });
};

export const AgenticCliMwpConnectionService = {
  isAgenticCliDeeplink(url: unknown): url is string {
    if (typeof url !== 'string') {
      return false;
    }

    try {
      const raw = parseMwpConnectPayload(url);
      return isAgenticCliConnectionRequest(raw);
    } catch {
      return false;
    }
  },

  async handleConnectDeeplink(
    url: string,
    deps: AgenticCliMwpConnectionDeps,
  ): Promise<void> {
    logger.debug('Handling agentic CLI connect deeplink:', redactUrl(url));

    let conn: Connection | undefined;
    let connInfo: ConnectionInfo | undefined;
    let connReq: AgenticCliConnectionRequest | undefined;
    let agenticCliStage: string | undefined;
    try {
      agenticCliStage = 'parse-connection-request';
      connReq = parseAgenticCliConnectionRequest(url);

      trackMwpEvent(MetaMetricsEvents.REMOTE_CONNECTION_REQUEST_RECEIVED, {
        remote_session_id:
          connReq.metadata.analytics?.remote_session_id ??
          connReq.sessionRequest.id,
        transport_type: TransportType.MWP,
        sdk_version: connReq.metadata.sdk.version,
        sdk_platform: connReq.metadata.sdk.platform,
        dapp_name: connReq.metadata.dapp.name,
        dapp_url: connReq.metadata.dapp.url,
      });

      if (
        INTERNAL_ORIGINS.includes(connReq.metadata.dapp.url) ||
        INTERNAL_ORIGINS.includes(connReq.metadata.dapp.name)
      ) {
        throw rpcErrors.invalidParams({
          message: 'External transactions cannot use internal origins',
        });
      }

      agenticCliStage = 'wait-for-keyring-unlock';
      await AgenticCliQrLoginService.waitForKeyringUnlock();

      connInfo = toConnectionInfo(connReq);
      if (deps.hasConnection(connInfo.id)) {
        logger.debug(
          'Already have a connection with this id, skipping',
          redactUrl(url),
        );
        return;
      }

      showAgenticCliConnectionLoading(connInfo);
      agenticCliStage = 'create-mwp-connection';
      conn = await Connection.create(
        connInfo,
        deps.keymanager,
        deps.relayURL,
        deps.hostapp,
      );
      wireAgenticCliClientEvents(conn);

      agenticCliStage = 'mwp-connect';
      await conn.connect(toUntrustedSessionRequest(connReq));

      try {
        await AgenticCliQrLoginService.handleConnection({
          connReq,
          conn,
          setStage: (stage) => {
            agenticCliStage = stage;
          },
          cleanupConnection: deps.cleanupConnection,
        });
      } finally {
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
        hideAgenticCliConnectionLoading(connInfo);
      }
    }
  },
};
