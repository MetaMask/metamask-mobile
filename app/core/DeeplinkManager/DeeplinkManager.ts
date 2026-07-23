'use strict';

import parseDeeplink from './utils/parseDeeplink';
import branch from 'react-native-branch';
import { Linking } from 'react-native';
import type { Notification as NotifeeNotification } from '@notifee/react-native';
import Logger from '../../util/Logger';
import { handleDeeplink } from './handlers/legacy/handleDeeplink';
import FCMService from '../../util/notifications/services/FCMService';
import AppConstants from '../AppConstants';
import { BranchParams } from './types/deepLinkAnalytics.types';
import {
  getBrazeInitialDeeplink,
  subscribeToBrazePushDeeplinks,
} from '../Braze/BrazeDeeplinks';
import type { DeeplinkIntent } from './types/DeeplinkIntent';
import NotificationsService from '../../util/notifications/services/NotificationService';
import { extractPushNotificationDeeplink } from '../../util/notifications/pushNotificationDeeplink';

const dispatchPushNotificationDeeplink = (
  deeplink: string | undefined | null,
) => {
  if (!deeplink) {
    return;
  }

  handleDeeplink({
    uri: deeplink,
    source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
  });
};

// `false` means the deeplink was handled but intentionally rejected, for
// example when the user dismisses the interstitial during startup resolution.
export type DeeplinkResolveResult = DeeplinkIntent | false | null;

/**
 * When Branch resolves a short link (e.g. metamask-alternate.app.link/1WkF6GmE40b),
 * the URI path may be link ID, not an in-app route. If the resolved params indicate
 * a clicked Branch link with a $deeplink_path, replace the host and path segment
 * with link.metamask.io/$deeplink_path while preserving the original query string.
 */
export function rewriteBranchUri(
  uri: string | undefined,
  params: BranchParams | undefined,
): string | undefined {
  try {
    if (!uri || !params?.['+clicked_branch_link']) return uri;
    const rawPath = params.$deeplink_path;
    if (typeof rawPath !== 'string') return uri;

    const parsed = new URL(uri);
    parsed.host = AppConstants.MM_IO_UNIVERSAL_LINK_HOST;
    // Set the pathname to the sanitized $deeplink_path
    parsed.pathname = `/${rawPath.replace(/^\//, '')}`;
    return parsed.toString();
  } catch (error) {
    Logger.error(error as Error, `Error rewriting Branch URI: ${uri}`);
    return uri;
  }
}

export class DeeplinkManager {
  // singleton instance
  private static _instance: DeeplinkManager | null = null;
  public pendingDeeplink: string | null;

  constructor() {
    this.pendingDeeplink = null;
  }

  static getInstance(): DeeplinkManager {
    if (!DeeplinkManager._instance) {
      DeeplinkManager._instance = new DeeplinkManager();
    }
    return DeeplinkManager._instance;
  }

  static resetInstance(): void {
    this._instance = null;
  }

  setDeeplink = (url: string) => (this.pendingDeeplink = url);

  getPendingDeeplink = () => this.pendingDeeplink;

  expireDeeplink = () => (this.pendingDeeplink = null);

  async parse(
    url: string,
    {
      browserCallBack,
      origin,
      onHandled,
    }: {
      browserCallBack?: (url: string) => void;
      origin: string;
      onHandled?: () => void;
    },
  ): Promise<boolean> {
    const result = await parseDeeplink({
      deeplinkManager: this,
      url,
      origin,
      browserCallBack,
      onHandled,
    });

    return typeof result === 'boolean' ? result : Boolean(result);
  }

  async resolve(
    url: string,
    {
      origin,
    }: {
      origin: string;
    },
  ): Promise<DeeplinkResolveResult> {
    const result = await parseDeeplink({
      deeplinkManager: this,
      url,
      origin,
      mode: 'resolve',
    });

    if (result === false) {
      return false;
    }

    return result && typeof result !== 'boolean' ? result : null;
  }

  static start() {
    DeeplinkManager.getInstance();

    const getBranchDeeplink = async (uri?: string) => {
      if (uri) {
        handleDeeplink({ uri });
        return;
      }

      try {
        const latestParams = await branch.getLatestReferringParams();

        // Cold start: params may contain a resolved Branch link with $deeplink_path.
        const rewritten = rewriteBranchUri(
          latestParams?.['~referring_link'] as string | undefined,
          latestParams as Record<string, unknown> | undefined,
        );
        if (rewritten) {
          handleDeeplink({ uri: rewritten });
          return;
        }

        const deeplink = latestParams?.['+non_branch_link'] as string;
        if (deeplink) {
          handleDeeplink({ uri: deeplink });
        }
      } catch (error) {
        Logger.error(error as Error, 'Error getting Branch deeplink');
      }
    };

    FCMService.onClickPushNotificationWhenAppClosed().then((deeplink) => {
      dispatchPushNotificationDeeplink(deeplink);
    });

    FCMService.onClickPushNotificationWhenAppSuspended((deeplink) => {
      dispatchPushNotificationDeeplink(deeplink);
    });

    const handleNotifeeNotification = (
      notification: NotifeeNotification | undefined,
    ) => {
      const deeplink = extractPushNotificationDeeplink(notification?.data);
      dispatchPushNotificationDeeplink(deeplink);
    };

    NotificationsService.onForegroundEvent(async (event) => {
      await NotificationsService.handleNotificationEvent({
        ...event,
        callback: handleNotifeeNotification,
      });
    });

    getBrazeInitialDeeplink().then((deeplink) => {
      if (deeplink) {
        handleDeeplink({
          uri: deeplink,
          source: AppConstants.DEEPLINKS.ORIGIN_BRAZE,
        });
      }
    });

    subscribeToBrazePushDeeplinks((deeplink) => {
      handleDeeplink({
        uri: deeplink,
        source: AppConstants.DEEPLINKS.ORIGIN_BRAZE,
      });
    });

    Linking.getInitialURL().then((url) => {
      if (!url) {
        return;
      }
      Logger.log(`handleDeeplink:: got initial URL ${url}`);
      handleDeeplink({ uri: url });
    });

    Linking.addEventListener('url', (params) => {
      const { url } = params;
      handleDeeplink({ uri: url });
    });

    // branch.subscribe is not called for iOS cold start after the new RN architecture upgrade.
    // This is a workaround to ensure that the deeplink is processed for iOS cold start.
    // TODO: Remove this once branch.subscribe is called for iOS cold start.
    getBranchDeeplink();

    branch.subscribe((opts) => {
      const { error } = opts;
      if (error) {
        const branchError = new Error(error);
        Logger.error(branchError, 'Error subscribing to branch.');
      }
      const rewritten = rewriteBranchUri(
        opts.uri,
        opts.params as Record<string, unknown> | undefined,
      );
      getBranchDeeplink(rewritten ?? opts.uri);
    });
  }
}

export default {
  init: () => DeeplinkManager.getInstance(),
  start: () => DeeplinkManager.start(),
  getInstance: () => DeeplinkManager.getInstance(),
  parse: (
    url: string,
    args: {
      browserCallBack?: (url: string) => void;
      origin: string;
      onHandled?: () => void;
    },
  ) => DeeplinkManager.getInstance().parse(url, args),
  resolve: (
    url: string,
    args: {
      origin: string;
    },
  ) => DeeplinkManager.getInstance().resolve(url, args),
  setDeeplink: (url: string) => DeeplinkManager.getInstance().setDeeplink(url),
  getPendingDeeplink: () => DeeplinkManager.getInstance().getPendingDeeplink(),
  expireDeeplink: () => DeeplinkManager.getInstance().expireDeeplink(),
};
