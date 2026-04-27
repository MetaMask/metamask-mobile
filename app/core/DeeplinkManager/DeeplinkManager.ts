'use strict';

import parseDeeplink from './utils/parseDeeplink';
import branch from 'react-native-branch';
import { Linking, Platform } from 'react-native';
import Logger from '../../util/Logger';
import { handleDeeplink } from './handlers/legacy/handleDeeplink';
import FCMService from '../../util/notifications/services/FCMService';
import AppConstants from '../AppConstants';
import { BranchParams } from './types/deepLinkAnalytics.types';
import {
  getBrazeInitialDeeplink,
  subscribeToBrazePushDeeplinks,
} from '../Braze/BrazeDeeplinks';

/**
 * Time to wait for `branch.subscribe` to fire with the resolved Branch
 * params after Android delivered a Branch stub URL via Linking.
 * If Branch hasn't fired by then we fall back to the stub so that the
 * deeplink is never lost — at the cost of attribution for that click.
 */
const ANDROID_BRANCH_STUB_FALLBACK_MS = 3000;

/**
 * Detects the Branch stub URL Android delivers to Linking.addEventListener
 * (and Linking.getInitialURL) when the user clicks a Branch deeplink while
 * the app is already open.
 *
 * The stub looks like `metamask://<path>?_branch_referrer=<encrypted>&link_click_id=<id>`.
 *
 * The `_branch_referrer` query parameter is an opaque token; the actual
 * UTM parameters are only available later, when the Branch RN SDK fires
 * `branch.subscribe` with the decoded params (~500 ms later in measurement).
 *
 * Processing the stub URL would:
 * 1. Fire `DEEP_LINK_USED` analytics with no UTM data (attribution lost).
 * 2. Cause the deeplink handler to run twice (stub then resolved URL).
 *
 * We therefore defer the stub URL on Android and let `branch.subscribe`
 * deliver the resolved URL with UTMs intact. iOS Universal Links already
 * deliver the resolved URL inline, so this only applies to Android.
 *
 * @internal exported for tests
 */
export function isAndroidBranchStubUrl(url: string): boolean {
  return Platform.OS === 'android' && url.includes('_branch_referrer=');
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

    // [Android warm start] State for deferring Branch stub URLs until
    // `branch.subscribe` resolves with the decoded UTM params. See
    // `isAndroidBranchStubUrl` for context.
    let pendingAndroidBranchStub: {
      url: string;
      timer: ReturnType<typeof setTimeout>;
    } | null = null;

    const clearAndroidBranchStub = () => {
      if (pendingAndroidBranchStub) {
        clearTimeout(pendingAndroidBranchStub.timer);
        pendingAndroidBranchStub = null;
      }
    };

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
      if (isAndroidBranchStubUrl(url)) {
        // Defer the stub: branch.subscribe will fire shortly with the resolved URL (and UTMs) and trigger handleDeeplink itself.
        clearAndroidBranchStub();
        const timer = setTimeout(() => {
          // Safety net: process the stub anyway so the deeplink isn't lost if Branch never resolves (network failure, SDK error, ...).
          pendingAndroidBranchStub = null;
          handleDeeplink({ uri: url });
        }, ANDROID_BRANCH_STUB_FALLBACK_MS);
        pendingAndroidBranchStub = { url, timer };
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
      // Branch resolved — cancel any deferred Android stub fallback so we don't double-process the deeplink.
      clearAndroidBranchStub();

      // Branch.subscribe fires for every onNewIntent on Android, including
      // intents that carry a non-Branch URI (e.g. `metamask://buy`). For those
      // we have no uri and `+clicked_branch_link` is false; the URI has
      // already been delivered to handleDeeplink via Linking.addEventListener
      // (warm start) or Linking.getInitialURL (cold start). Falling through
      // to getBranchDeeplink would re-fetch the same URI from
      // `+non_branch_link` and dispatch it a second time.
      const isBranchClick = opts.params?.['+clicked_branch_link'] === true;
      if (!opts.uri && !isBranchClick) return;

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
