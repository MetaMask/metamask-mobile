import { CompletedRequest, Mockttp } from 'mockttp';
import {
  getMockOnChainNotificationsConfig,
  getMockUpdateOnChainNotifications,
} from '@metamask/notification-services-controller/notification-services/mocks';
import { getDecodedProxiedURL } from './helpers';
import { createLogger } from '../../../framework/logger';

const GET_CONFIG_URL = getMockOnChainNotificationsConfig().url;
const UPDATE_CONFIG_URL = getMockUpdateOnChainNotifications().url;

const logger = createLogger({
  name: 'MockttpNotificationTriggerServer',
});

export interface NotificationConfig {
  address: string;
  enabled: boolean;
}

export class MockttpNotificationTriggerServer {
  // Store notification configs by address
  private notificationConfigs: Map<string, boolean> = new Map();

  readonly getConfig = async (
    request: Pick<CompletedRequest, 'body'>,
    statusCode: number = 200,
  ) => {
    const requestBody = (await request.body.getJson()) as { address: string }[];

    const response: NotificationConfig[] = requestBody.map(({ address }) => {
      const normalizedAddress = address.toLowerCase();
      // Return saved config or default to false for new addresses
      const enabled = this.notificationConfigs.get(normalizedAddress) ?? false;

      return {
        address: normalizedAddress,
        enabled,
      };
    });

    return {
      statusCode,
      json: response,
    };
  };

  // Per-address upsert the controller performs when accounts are
  // enabled/disabled (and on first-time setup). Mirrors the real endpoint,
  // which upserts rather than replacing the whole subscription list.
  readonly updateConfig = async (
    request: Pick<CompletedRequest, 'body'>,
    statusCode: number = 204,
  ) => {
    const requestBody = (await request.body.getJson()) as NotificationConfig[];

    for (const { address, enabled } of requestBody) {
      this.notificationConfigs.set(address.toLowerCase(), enabled);
    }

    return {
      statusCode,
    };
  };

  setupServer = async (server: Mockttp) => {
    // Mobile uses a API url proxy, where all subsequent calls need to pulled out from this proxy API
    await server
      .forPost('/proxy')
      .matching((request) =>
        getDecodedProxiedURL(request.url).includes(GET_CONFIG_URL),
      )
      .asPriority(999)
      .thenCallback((request) => {
        logger.debug(
          `Mocking ${request.method} request to: ${getDecodedProxiedURL(
            request.url,
          )}`,
        );
        return this.getConfig(request);
      });

    // The update endpoint URL is a prefix of the query endpoint URL, so the
    // query rule above must not be shadowed by this one.
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = getDecodedProxiedURL(request.url);
        return url.includes(UPDATE_CONFIG_URL) && !url.includes(GET_CONFIG_URL);
      })
      .asPriority(999)
      .thenCallback((request) => {
        logger.debug(
          `Mocking ${request.method} request to: ${getDecodedProxiedURL(
            request.url,
          )}`,
        );
        return this.updateConfig(request);
      });
  };

  // Helper methods for testing
  setNotificationConfig(address: string, enabled: boolean) {
    this.notificationConfigs.set(address.toLowerCase(), enabled);
  }

  getNotificationConfig(address: string): boolean | undefined {
    return this.notificationConfigs.get(address.toLowerCase());
  }

  clearConfigs() {
    this.notificationConfigs.clear();
  }

  reset() {
    this.clearConfigs();
  }
}
