'use strict';

import parseDeeplink from './utils/parseDeeplink';
import branch from 'react-native-branch';
import { Linking } from 'react-native';
import Logger from '../../util/Logger';
import { handleDeeplink } from './handlers/legacy/handleDeeplink';
import FCMService from '../../util/notifications/services/FCMService';
import AppConstants from '../AppConstants';

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
  ) {
    return await parseDeeplink({
      deeplinkManager: this,
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  }

  /**
   * Allowed hosts for Branch $canonical_url so we only use it when it's a MetaMask destination.
   */
  private static readonly METAMASK_LINK_HOSTS = [
    AppConstants.MM_UNIVERSAL_LINK_HOST,
    AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
    AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST,
  ];

  /**
   * Returns true if the URL has a host we accept for universal links.
   */
  private static isMetamaskUniversalLinkHost(urlString: string): boolean {
    try {
      const host = new URL(urlString).hostname;
      return DeeplinkManager.METAMASK_LINK_HOSTS.includes(host);
    } catch {
      return false;
    }
  }

  /**
   * Resolves the deeplink URL from Branch session params.
   * Handles both non-Branch links (+non_branch_link) and Branch links opened
   * via webpage fallback (~referring_link), e.g. when opened from in-app
   * browsers (e.g. X/Twitter) that don't support universal links.
   * Prefers $canonical_url over ~referring_link when it's a MetaMask host so
   * we get the real path (e.g. /trending) instead of a Branch short-link path
   * that would show "This page doesn't exist".
   */
  private static getDeeplinkFromBranchParams(
    params: unknown,
  ): string | undefined {
    if (!params || typeof params !== 'object') {
      return undefined;
    }
    const p = params as Record<string, unknown>;
    const nonBranchLink = p['+non_branch_link'];
    if (typeof nonBranchLink === 'string' && nonBranchLink) {
      return nonBranchLink;
    }
    if (!p['+clicked_branch_link']) {
      return undefined;
    }
    const canonicalUrl = p.$canonical_url;
    if (
      typeof canonicalUrl === 'string' &&
      canonicalUrl &&
      DeeplinkManager.isMetamaskUniversalLinkHost(canonicalUrl)
    ) {
      return canonicalUrl as string;
    }
    if (typeof p['~referring_link'] === 'string') {
      return p['~referring_link'] as string;
    }
    return undefined;
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
        const deeplink =
          DeeplinkManager.getDeeplinkFromBranchParams(latestParams);
        if (deeplink) {
          handleDeeplink({ uri: deeplink });
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
      const { error, uri, params } = opts;
      if (error) {
        const branchError = new Error(error);
        Logger.error(branchError, 'Error subscribing to branch.');
      }
      // Prefer uri (universal link), then Branch params (webpage fallback e.g. X in-app browser)
      const deeplink =
        uri || DeeplinkManager.getDeeplinkFromBranchParams(params);
      if (deeplink) {
        handleDeeplink({ uri: deeplink });
        return;
      }
      branch.getLatestReferringParams().then((val) => {
        const fallbackDeeplink =
          DeeplinkManager.getDeeplinkFromBranchParams(val);
        if (fallbackDeeplink) {
          handleDeeplink({ uri: fallbackDeeplink });
        }
      });
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
