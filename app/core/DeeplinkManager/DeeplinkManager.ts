'use strict';

import parseDeeplink from './utils/parseDeeplink';
import branch, { BranchParams } from 'react-native-branch';
import { Linking } from 'react-native';
import Logger from '../../util/Logger';
import { handleDeeplink } from './handlers/legacy/handleDeeplink';
import FCMService from '../../util/notifications/services/FCMService';
import AppConstants from '../AppConstants';

/**
 * Extract a usable deeplink URI from Branch session data.
 *
 * Priority: direct URI > +non_branch_link > ~referring_link.
 * The ~referring_link fallback handles the deepview case (e.g. X/Twitter in-app browser)
 * where the app is opened via Branch's webpage rather than a direct Universal Link.
 */
function extractDeeplinkFromBranchParams(
  uri?: string,
  params?: BranchParams,
): string | undefined {
  if (uri) return uri;

  if (!params) return undefined;

  const nonBranchLink = params['+non_branch_link'] as string | undefined;
  if (nonBranchLink) return nonBranchLink;

  if (params['+clicked_branch_link'] && params['~referring_link']) {
    return params['~referring_link'] as string;
  }

  return undefined;
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
    branch
      .getLatestReferringParams()
      .then((params) => {
        const deeplink = extractDeeplinkFromBranchParams(undefined, params);
        if (deeplink) {
          handleDeeplink({ uri: deeplink });
        }
      })
      .catch((error: Error) => {
        Logger.error(error, 'Error getting Branch deeplink on cold start');
      });

    branch.subscribe((opts) => {
      const { error, uri, params } = opts;
      if (error) {
        Logger.error(new Error(error), 'Error subscribing to branch.');
        return;
      }

      const deeplink = extractDeeplinkFromBranchParams(uri, params);
      Logger.log(
        `Branch subscribe: uri=${uri} clickedBranchLink=${params?.['+clicked_branch_link']} referringLink=${params?.['~referring_link']} resolvedDeeplink=${deeplink}`,
      );
      if (deeplink) {
        handleDeeplink({ uri: deeplink });
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
