'use strict';

import parseDeeplink from './utils/parseDeeplink';
import branch from 'react-native-branch';
import { Linking } from 'react-native';
import Logger from '../../util/Logger';
import { handleDeeplink } from './handlers/legacy/handleDeeplink';
import FCMService from '../../util/notifications/services/FCMService';
import AppConstants from '../AppConstants';
import { BranchParams } from './types/deepLinkAnalytics.types';

const BRANCH_DOMAIN_HOSTS = [
  AppConstants.MM_UNIVERSAL_LINK_HOST,
  AppConstants.MM_UNIVERSAL_LINK_HOST_ALTERNATE,
];

/**
 * Branch domain URLs (metamask.app.link, metamask-alternate.app.link) are handled
 * by the Branch SDK. Returns true if the URL belongs to a Branch domain so that
 * the Linking API can skip it and avoid duplicate processing.
 */
export function isBranchDomainUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return BRANCH_DOMAIN_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

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
    if (!uri || !params?.['+clicked_branch_link']) return undefined;
    const rawPath = params.$deeplink_path;
    if (typeof rawPath !== 'string') return undefined;

    const parsed = new URL(uri);
    parsed.host = AppConstants.MM_IO_UNIVERSAL_LINK_HOST;
    parsed.pathname = `/${rawPath.replace(/^\//, '')}`;
    return parsed.toString();
  } catch (error) {
    Logger.error(error as Error, `Error rewriting Branch URI: ${uri}`);
    return undefined;
  }
}

export class DeeplinkManager {
  private static _instance: DeeplinkManager | null = null;
  public pendingDeeplink: string | null;
  public cachedBranchParams: BranchParams | undefined;

  constructor() {
    this.pendingDeeplink = null;
    this.cachedBranchParams = undefined;
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
    const instance = DeeplinkManager.getInstance();

    const cacheBranchParams = (params: Record<string, unknown> | undefined) => {
      if (params && typeof params === 'object' && Object.keys(params).length) {
        instance.cachedBranchParams = params as BranchParams;
      }
    };

    const getBranchDeeplink = async (uri?: string) => {
      if (uri) {
        handleDeeplink({ uri });
        return;
      }

      try {
        const latestParams = await branch.getLatestReferringParams();
        cacheBranchParams(latestParams as Record<string, unknown> | undefined);

        const rewritten = rewriteBranchUri(
          latestParams?.['~referring_link'] as string | undefined,
          latestParams as Record<string, unknown> | undefined,
        );
        if (rewritten) {
          handleDeeplink({ uri: rewritten });
        }
      } catch (error) {
        Logger.error(error as Error, 'Error getting Branch deeplink');
      }
    };

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

    Linking.getInitialURL().then((url) => {
      if (!url) {
        return;
      }
      if (isBranchDomainUrl(url)) {
        Logger.log(
          `handleDeeplink:: skipping Branch domain URL from Linking: ${url}`,
        );
        return;
      }
      Logger.log(`handleDeeplink:: got initial URL ${url}`);
      handleDeeplink({ uri: url });
    });

    Linking.addEventListener('url', (params) => {
      const { url } = params;
      if (isBranchDomainUrl(url)) {
        return;
      }
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
      cacheBranchParams(opts.params as Record<string, unknown> | undefined);
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
  setDeeplink: (url: string) => DeeplinkManager.getInstance().setDeeplink(url),
  getPendingDeeplink: () => DeeplinkManager.getInstance().getPendingDeeplink(),
  expireDeeplink: () => DeeplinkManager.getInstance().expireDeeplink(),
};
