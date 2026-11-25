'use strict';

import parseDeeplink from './utils/parseDeeplink';
import branch from 'react-native-branch';
import { Linking, Platform } from 'react-native';
import type { Notification as NotifeeNotification } from '@notifee/react-native';
import Logger from '../../util/Logger';
import { ensureError } from '../../util/errorUtils';
import { handleDeeplink } from './handlers/handleDeeplink';
import FCMService, {
  toPushTapResult,
} from '../../util/notifications/services/FCMService';
import AppConstants from '../AppConstants';
import { isSupportedAction } from './types/deepLink.types';
import { isMetaMaskUniversalLink } from './util/deeplinks';
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

// `false` means the deeplink was handled but intentionally rejected, for
// example when the user dismisses the interstitial during startup resolution.
export type DeeplinkResolveResult = DeeplinkIntent | false | null;

export const BRANCH_SHORTLINK_FALLBACK_MS = 1500;
const BRANCH_RESOLUTION_WINDOW_MS = 5000;

/**
 * Returns true when a universal link on a MetaMask Branch host has a first path
 * segment the deeplink pipeline does not route (for example `invite-perps` or
 * `1WkF6GmE40b`), meaning it is likely a Branch short link whose destination
 * arrives asynchronously via Branch `$deeplink_path`.
 */
export function isPendingBranchShortlink(url: string): boolean {
  if (!isMetaMaskUniversalLink(url)) {
    return false;
  }

  try {
    const { pathname } = new URL(url);
    const firstSegment = pathname.split('/')[1] ?? '';
    return firstSegment.length > 0 && !isSupportedAction(firstSegment);
  } catch {
    return false;
  }
}

/**
 * Keys a short link by origin and path so the bare alias Android delivers via
 * `Linking` matches the same alias as reported by Branch. Cold-start Branch
 * reports the stored `~referring_link`, which carries attribution params
 * (`_branch_match_id`, `_branch_referrer`) that the intent often lacks, so a
 * full-URL comparison would miss the duplicate and replay the invalid modal.
 */
function getShortlinkMatchKey(uri: string): string {
  try {
    const parsed = new URL(uri);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return uri;
  }
}

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

    let pendingShortlinkTimer: ReturnType<typeof setTimeout> | null = null;
    let lastBranchResolvedKey: string | null = null;
    let lastBranchResolvedAt = 0;

    const clearPendingShortlink = () => {
      if (pendingShortlinkTimer !== null) {
        clearTimeout(pendingShortlinkTimer);
        pendingShortlinkTimer = null;
      }
    };

    const recordBranchResolution = (rawUri?: string) => {
      clearPendingShortlink();
      if (rawUri) {
        lastBranchResolvedKey = getShortlinkMatchKey(rawUri);
        lastBranchResolvedAt = Date.now();
      }
    };

    // On Android, React Native Linking receives the raw App Link intent before
    // Branch resolves short-link aliases (such as link.metamask.io/invite-home
    // or metamask.app.link/1WkF6GmE40b). Hold unknown paths on Branch hosts so
    // Branch delivers the resolved $deeplink_path first instead of flashing the
    // invalid-link modal, while keeping a fallback timer for offline/404 paths.
    const handleLinkingUrl = (url: string) => {
      if (Platform.OS === 'android' && isPendingBranchShortlink(url)) {
        if (
          lastBranchResolvedKey === getShortlinkMatchKey(url) &&
          Date.now() - lastBranchResolvedAt < BRANCH_RESOLUTION_WINDOW_MS
        ) {
          return;
        }
        clearPendingShortlink();
        pendingShortlinkTimer = setTimeout(() => {
          pendingShortlinkTimer = null;
          handleDeeplink({ uri: url });
        }, BRANCH_SHORTLINK_FALLBACK_MS);
        return;
      }

      clearPendingShortlink();
      handleDeeplink({ uri: url });
    };

    const getBranchDeeplink = async (uri?: string, rawUri?: string) => {
      if (uri) {
        recordBranchResolution(rawUri ?? uri);
        handleDeeplink({ uri });
        return;
      }

      try {
        const latestParams = await branch.getLatestReferringParams();

        // Cold start: params may contain a resolved Branch link with $deeplink_path.
        const referringLink = latestParams?.['~referring_link'] as
          | string
          | undefined;
        const rewritten = rewriteBranchUri(
          referringLink,
          latestParams as Record<string, unknown> | undefined,
        );
        if (rewritten) {
          recordBranchResolution(referringLink ?? rewritten);
          handleDeeplink({ uri: rewritten });
          return;
        }

        const deeplink = latestParams?.['+non_branch_link'] as string;
        if (deeplink) {
          recordBranchResolution(deeplink);
          handleDeeplink({ uri: deeplink });
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

    Linking.getInitialURL()
      .then((url) => {
        if (!url) {
          return;
        }
        Logger.log(`handleDeeplink:: got initial URL ${url}`);
        handleLinkingUrl(url);
      })
      .catch((error: unknown) => {
        Logger.error(ensureError(error), 'Error handling initial deeplink');
      });

    Linking.addEventListener('url', (params) => {
      const { url } = params;
      handleLinkingUrl(url);
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
      getBranchDeeplink(rewritten ?? opts.uri, opts.uri).catch(
        (error: unknown) => {
          Logger.error(ensureError(error), 'Error handling Branch deeplink');
        },
      );
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
