'use strict';

import parseDeeplink from './utils/parseDeeplink';
import branch from 'react-native-branch';
import { Linking } from 'react-native';
import Logger from '../../util/Logger';
import { handleDeeplink } from './handlers/legacy/handleDeeplink';
import FCMService from '../../util/notifications/services/FCMService';
import AppConstants from '../AppConstants';
import {
  writeBranchDebug,
  fetchBranchLinkData,
  resolveShortLinkViaApi,
} from './branchApi';

/**
 * Branch short-link domains carry a link ID (e.g. /1WkF6GmE40b), NOT an
 * in-app route. React Native Linking must never attempt to route these;
 * the Branch SDK resolves them and provides the actual route via $deeplink_path.
 */
export function isBranchShortLinkUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === AppConstants.MM_UNIVERSAL_LINK_HOST ||
      hostname === AppConstants.MM_UNIVERSAL_LINK_HOST_ALTERNATE
    );
  } catch {
    return false;
  }
}

/**
 * Builds a canonical deep link URL from a Branch $deeplink_path value.
 * e.g. "trending" → "https://link.metamask.io/trending"
 */
export function buildDeepLinkFromPath(path: string): string {
  return `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${path.replace(/^\//, '')}`;
}

/**
 * Attempts to extract a routable deep link URL from Branch-resolved params.
 * Checks $deeplink_path, $canonical_url, and $desktop_url (in priority order).
 * Returns undefined when no route can be determined.
 */
export function resolveRouteFromBranchParams(
  params: Record<string, unknown> | undefined,
): string | undefined {
  if (!params) return undefined;

  // 1. $deeplink_path — preferred, set explicitly in the Branch dashboard
  const deepLinkPath = params.$deeplink_path;
  if (typeof deepLinkPath === 'string' && deepLinkPath.length > 0) {
    return buildDeepLinkFromPath(deepLinkPath);
  }

  // 2. $canonical_url — may contain a full MetaMask universal link
  const canonical = params.$canonical_url;
  if (typeof canonical === 'string' && canonical.length > 0) {
    try {
      const url = new URL(canonical);
      const path = url.pathname.replace(/^\//, '');
      if (path.length > 0) {
        return buildDeepLinkFromPath(path + url.search);
      }
    } catch {
      // not a valid URL — skip
    }
  }

  // 3. $desktop_url — another place teams sometimes put the destination
  const desktop = params.$desktop_url;
  if (typeof desktop === 'string' && desktop.length > 0) {
    try {
      const url = new URL(desktop);
      const path = url.pathname.replace(/^\//, '');
      if (path.length > 0) {
        return buildDeepLinkFromPath(path + url.search);
      }
    } catch {
      // not a valid URL — skip
    }
  }

  return undefined;
}

export class DeeplinkManager {
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
  ) {
    return await parseDeeplink({
      deeplinkManager: this,
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  }

  static start() {
    DeeplinkManager.getInstance();

    FCMService.onClickPushNotificationWhenAppClosed().then((deeplink) => {
      if (deeplink) {
        handleDeeplink({
          uri: deeplink,
          source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
        });
      }
    });

    FCMService.onClickPushNotificationWhenAppSuspended((deeplink) => {
      if (deeplink) {
        handleDeeplink({
          uri: deeplink,
          source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
        });
      }
    });

    // Branch short-link URLs must be skipped here — they contain a link ID,
    // not an in-app route. The Branch SDK (below) will resolve them.
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      if (isBranchShortLinkUrl(url)) {
        writeBranchDebug('Linking.getInitialURL SKIPPED (Branch)', { url });
        fetchBranchLinkData(url);
        return;
      }
      handleDeeplink({ uri: url });
    });

    Linking.addEventListener('url', ({ url }) => {
      if (isBranchShortLinkUrl(url)) {
        writeBranchDebug('Linking.addEventListener SKIPPED (Branch)', { url });
        fetchBranchLinkData(url);
        return;
      }
      handleDeeplink({ uri: url });
    });

    // branch.subscribe may not fire on iOS cold start after the RN architecture upgrade.
    // This workaround reads getLatestReferringParams directly.
    // TODO: Remove once branch.subscribe fires reliably on iOS cold start.
    (async () => {
      try {
        const params = await branch.getLatestReferringParams();
        const uri = resolveRouteFromBranchParams(params);
        await writeBranchDebug('COLD START', {
          resolvedRoute: uri ?? 'NONE',
          rawParams: params,
        });
        if (uri) {
          handleDeeplink({ uri });
          return;
        }

        // SDK failed to resolve — if +non_branch_link is a Branch short link,
        // the SDK didn't click-attribute it (NativeLink). Resolve via HTTP API.
        const nonBranchLink = params?.['+non_branch_link'] as string;
        if (nonBranchLink && isBranchShortLinkUrl(nonBranchLink)) {
          const apiRoute = await resolveShortLinkViaApi(nonBranchLink);
          if (apiRoute) {
            handleDeeplink({ uri: apiRoute });
            return;
          }
        }

        if (nonBranchLink && !isBranchShortLinkUrl(nonBranchLink)) {
          handleDeeplink({ uri: nonBranchLink });
        }
      } catch (error) {
        Logger.error(error as Error, 'Error getting Branch deeplink');
      }
    })();

    branch.subscribe(async (opts) => {
      if (opts.error) {
        Logger.error(new Error(opts.error), 'Error subscribing to branch.');
        return;
      }

      const uri = resolveRouteFromBranchParams(opts.params);
      await writeBranchDebug('SUBSCRIBE', {
        resolvedRoute: uri ?? 'NONE',
        uri: opts.uri,
        rawParams: opts.params,
      });
      if (uri) {
        handleDeeplink({ uri });
        return;
      }

      // SDK failed — if the URI is a Branch short link the SDK didn't resolve,
      // try the HTTP API as a fallback.
      if (opts.uri && isBranchShortLinkUrl(opts.uri)) {
        const apiRoute = await resolveShortLinkViaApi(opts.uri);
        if (apiRoute) {
          handleDeeplink({ uri: apiRoute });
          return;
        }
      }

      // Non-Branch URIs (e.g. link.metamask.io/trending) can be routed directly.
      if (opts.uri && !isBranchShortLinkUrl(opts.uri)) {
        handleDeeplink({ uri: opts.uri });
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
    },
  ) => DeeplinkManager.getInstance().parse(url, args),
  setDeeplink: (url: string) => DeeplinkManager.getInstance().setDeeplink(url),
  getPendingDeeplink: () => DeeplinkManager.getInstance().getPendingDeeplink(),
  expireDeeplink: () => DeeplinkManager.getInstance().expireDeeplink(),
};
