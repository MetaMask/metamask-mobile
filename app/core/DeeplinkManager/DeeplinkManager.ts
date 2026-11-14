'use strict';

import parseDeeplink from './utils/parseDeeplink';
import branch from 'react-native-branch';
import { Linking } from 'react-native';
import type { Notification as NotifeeNotification } from '@notifee/react-native';
import Logger from '../../util/Logger';
import { handleDeeplink } from './handlers/handleDeeplink';
import FCMService, {
  toPushTapResult,
} from '../../util/notifications/services/FCMService';
import AppConstants from '../AppConstants';
import { BranchParams } from './types/deepLinkAnalytics.types';
import {
  getBrazeInitialPush,
  subscribeToBrazePushOpens,
} from '../Braze/BrazeDeeplinks';
import {
  AppOpenedPushProvider,
  AppStateEventProcessor,
} from '../AppStateEventListener';
import type { DeeplinkIntent } from './types/DeeplinkIntent';
import NotificationsService from '../../util/notifications/services/NotificationService';
import {
  startDeeplinkProcessedTrace,
  endDeeplinkProcessedTrace,
  cancelDeeplinkProcessedTrace,
  type DeeplinkPerfAppStartType,
} from '../Performance/DeeplinkPerformance';
import { getUnlockAppStartType } from '../Performance/unlockTraces';
import { getBranchShortLinkId } from './util/deeplinks';

// `false` means the deeplink was handled but intentionally rejected, for
// example when the user dismisses the interstitial during startup resolution.
export type DeeplinkResolveResult = DeeplinkIntent | false | null;

/**
 * When Branch resolves a short link (e.g. metamask-alternate.app.link/1WkF6GmE40b),
 * the URI path may be link ID, not an in-app route. If the resolved params indicate
 * a clicked Branch link with a $deeplink_path, replace the host and path segment
 * with link.metamask.io/$deeplink_path while preserving the original query string.
 * A query on `$deeplink_path` itself (e.g. `social/profile?traderId=…`) fills
 * the keys that string does not already have.
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
    const queryStart = rawPath.indexOf('?');
    const path = queryStart === -1 ? rawPath : rawPath.slice(0, queryStart);
    // Set the pathname to the sanitized $deeplink_path
    parsed.pathname = `/${path.replace(/^\//, '')}`;
    // A Branch short link's own query does not carry the route's ids (e.g. a
    // shared trader's traderId and positionId); the share flow puts them on
    // $deeplink_path. Copy only keys the short link does not already have, so
    // an existing query such as a swap amount stays as it was.
    if (queryStart !== -1) {
      new URLSearchParams(rawPath.slice(queryStart + 1)).forEach(
        (value, key) => {
          if (!parsed.searchParams.has(key)) {
            parsed.searchParams.set(key, value);
          }
        },
      );
    }
    return parsed.toString();
  } catch (error) {
    Logger.error(error as Error, `Error rewriting Branch URI: ${uri}`);
    return uri;
  }
}

/**
 * How long a raw Branch short link waits for Branch to deliver the route it
 * resolves to before it is handled as is. Also how long after Branch resolves
 * a short link a raw copy of that link is ignored.
 */
export const BRANCH_SHORT_LINK_RESOLVE_WINDOW_MS = 5000;

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
      appStartType = 'warm',
    }: {
      browserCallBack?: (url: string) => void;
      origin: string;
      onHandled?: () => void;
      appStartType?: DeeplinkPerfAppStartType;
    },
  ): Promise<boolean> {
    const processedTraceToken = startDeeplinkProcessedTrace({
      url,
      source: 'parse',
      appStartType,
    });

    const result = await parseDeeplink({
      deeplinkManager: this,
      url,
      origin,
      browserCallBack,
      onHandled,
      processedTraceToken,
    });

    return typeof result === 'boolean' ? result : Boolean(result);
  }

  async resolve(
    url: string,
    {
      origin,
      appStartType = getUnlockAppStartType(),
    }: {
      origin: string;
      appStartType?: DeeplinkPerfAppStartType;
    },
  ): Promise<DeeplinkResolveResult> {
    const processedTraceToken = startDeeplinkProcessedTrace({
      url,
      source: 'resolve',
      appStartType,
    });

    const result = await parseDeeplink({
      deeplinkManager: this,
      url,
      origin,
      mode: 'resolve',
      processedTraceToken,
    });

    if (result === false) {
      cancelDeeplinkProcessedTrace({
        reason: 'rejected',
        traceToken: processedTraceToken,
      });
      return false;
    }

    const intent = result && typeof result !== 'boolean' ? result : null;

    if (intent === null) {
      cancelDeeplinkProcessedTrace({
        reason: 'unresolved',
        traceToken: processedTraceToken,
      });
    }

    return intent;
  }

  static start() {
    DeeplinkManager.getInstance();

    // A Branch short link (e.g. metamask-alternate.app.link/1WkF6GmE40b) can
    // reach JS twice: raw, from Linking or from Branch before it has the
    // link's params, and resolved to its $deeplink_path, from Branch. The raw
    // copy names no route, so handling it opens the "This page doesn't exist"
    // interstitial before (or after) the real destination. On iOS cold start
    // the raw copy arrives just after the resolved one; elsewhere it can
    // arrive first. A raw short link therefore waits for Branch, and is
    // ignored once Branch has resolved the same link.
    let pendingShortLink: {
      id: string;
      timer: ReturnType<typeof setTimeout>;
    } | null = null;
    let resolvedShortLink: { id: string; at: number } | null = null;

    const clearPendingShortLink = (): void => {
      if (pendingShortLink) {
        clearTimeout(pendingShortLink.timer);
        pendingShortLink = null;
      }
    };

    /**
     * Handles a link Branch reported as a clicked Branch link, rewritten to
     * its $deeplink_path. Without a $deeplink_path the link has no route and
     * is handled as is, so a genuinely invalid link still reaches the
     * interstitial.
     */
    const handleResolvedBranchLink = (
      uri: string,
      params: BranchParams,
    ): void => {
      clearPendingShortLink();
      const id = getBranchShortLinkId(uri);
      if (id) {
        resolvedShortLink = { id, at: Date.now() };
      }
      handleDeeplink({ uri: rewriteBranchUri(uri, params) ?? uri });
    };

    /**
     * Handles a raw Branch short link once it has waited for Branch. Branch
     * params are read once more, since iOS cold start does not call
     * branch.subscribe and the first read can be too early.
     */
    const flushUnresolvedShortLink = async (
      uri: string,
      id: string,
    ): Promise<void> => {
      try {
        const latestParams = (await branch.getLatestReferringParams()) as
          | BranchParams
          | undefined;
        const referringLink = latestParams?.['~referring_link'];
        if (
          latestParams?.['+clicked_branch_link'] &&
          typeof referringLink === 'string' &&
          getBranchShortLinkId(referringLink) === id
        ) {
          handleResolvedBranchLink(referringLink, latestParams);
          return;
        }
      } catch (error) {
        Logger.error(error as Error, 'Error getting Branch deeplink');
      }
      handleDeeplink({ uri });
    };

    /**
     * Handles a link Branch has not resolved. A raw Branch short link waits
     * up to BRANCH_SHORT_LINK_RESOLVE_WINDOW_MS for the resolved delivery,
     * and is dropped if Branch already resolved it.
     */
    const handleIncomingDeeplink = (uri: string): void => {
      const id = getBranchShortLinkId(uri);
      if (!id) {
        clearPendingShortLink();
        handleDeeplink({ uri });
        return;
      }

      if (
        resolvedShortLink?.id === id &&
        Date.now() - resolvedShortLink.at < BRANCH_SHORT_LINK_RESOLVE_WINDOW_MS
      ) {
        Logger.log(
          `Deeplink: Ignoring Branch short link already resolved: ${uri}`,
        );
        return;
      }

      clearPendingShortLink();
      Logger.log(`Deeplink: Waiting for Branch to resolve short link: ${uri}`);
      pendingShortLink = {
        id,
        timer: setTimeout(() => {
          pendingShortLink = null;
          flushUnresolvedShortLink(uri, id);
        }, BRANCH_SHORT_LINK_RESOLVE_WINDOW_MS),
      };
    };

    const getBranchDeeplink = async (): Promise<void> => {
      try {
        const latestParams = (await branch.getLatestReferringParams()) as
          | BranchParams
          | undefined;

        // Cold start: params may contain a resolved Branch link with $deeplink_path.
        const referringLink = latestParams?.['~referring_link'];
        if (
          latestParams &&
          typeof referringLink === 'string' &&
          referringLink
        ) {
          if (latestParams['+clicked_branch_link']) {
            handleResolvedBranchLink(referringLink, latestParams);
          } else {
            handleIncomingDeeplink(referringLink);
          }
          return;
        }

        const deeplink = latestParams?.['+non_branch_link'];
        if (typeof deeplink === 'string' && deeplink) {
          handleIncomingDeeplink(deeplink);
        }
      } catch (error) {
        Logger.error(error as Error, 'Error getting Branch deeplink');
      }
    };

    // Every push tap is reported to AppStateEventProcessor regardless of the
    // payload, so App Opened can attribute the open to push even when there is
    // no deeplink to carry the origin. handleDeeplink still only runs when
    // there is somewhere to navigate.
    const PROVIDER_ORIGIN = {
      [AppOpenedPushProvider.Braze]: AppConstants.DEEPLINKS.ORIGIN_BRAZE,
      [AppOpenedPushProvider.Wallet]:
        AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
    };

    const onPushTap = (
      provider: AppOpenedPushProvider,
      tap: {
        deeplink: string | null;
        notificationType?: string;
        notificationSubtype?: string;
      },
    ) => {
      AppStateEventProcessor.markOpenedFromPush({
        provider,
        notificationType: tap.notificationType,
        notificationSubtype: tap.notificationSubtype,
      });
      if (tap.deeplink) {
        handleDeeplink({
          uri: tap.deeplink,
          source: PROVIDER_ORIGIN[provider],
        });
      }
    };

    FCMService.onClickPushNotificationWhenAppClosed().then((tap) => {
      if (tap.opened) {
        onPushTap(AppOpenedPushProvider.Wallet, tap);
      }
    });

    FCMService.onClickPushNotificationWhenAppSuspended((tap) => {
      if (tap.opened) {
        onPushTap(AppOpenedPushProvider.Wallet, tap);
      }
    });

    const handleNotifeeNotification = (
      notification: NotifeeNotification | undefined,
    ) => {
      if (!notification) {
        return;
      }

      const tap = toPushTapResult(notification.data, true);
      if (!tap.deeplink && !tap.notificationType && !tap.notificationSubtype) {
        return;
      }

      onPushTap(AppOpenedPushProvider.Wallet, tap);
    };

    NotificationsService.onForegroundEvent(async (event) => {
      await NotificationsService.handleNotificationEvent({
        ...event,
        callback: handleNotifeeNotification,
      });
    });

    getBrazeInitialPush().then(({ opened, deeplink }) => {
      if (opened) {
        onPushTap(AppOpenedPushProvider.Braze, { deeplink });
      }
    });

    subscribeToBrazePushOpens((deeplink) => {
      onPushTap(AppOpenedPushProvider.Braze, { deeplink });
    });

    Linking.getInitialURL().then((url) => {
      if (!url) {
        return;
      }
      Logger.log(`handleDeeplink:: got initial URL ${url}`);
      handleIncomingDeeplink(url);
    });

    Linking.addEventListener('url', (params) => {
      const { url } = params;
      handleIncomingDeeplink(url);
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
      const { uri } = opts;
      const params = opts.params as BranchParams | undefined;
      if (!uri) {
        getBranchDeeplink();
        return;
      }
      if (params?.['+clicked_branch_link']) {
        handleResolvedBranchLink(uri, params);
      } else {
        handleIncomingDeeplink(uri);
      }
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
      appStartType?: DeeplinkPerfAppStartType;
    },
  ) => DeeplinkManager.getInstance().parse(url, args),
  resolve: (
    url: string,
    args: {
      origin: string;
      appStartType?: DeeplinkPerfAppStartType;
    },
  ) => DeeplinkManager.getInstance().resolve(url, args),
  setDeeplink: (url: string) => DeeplinkManager.getInstance().setDeeplink(url),
  getPendingDeeplink: () => DeeplinkManager.getInstance().getPendingDeeplink(),
  expireDeeplink: () => DeeplinkManager.getInstance().expireDeeplink(),
};
