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
 * Strips Branch Deepview query params from a URL to recover the original
 * short link. The Deepview page appends __branch_* and _referrer params
 * that can confuse the Branch SDK's link resolution.
 */
export function stripBranchDeepviewParams(url: string): string {
  try {
    const parsed = new URL(url);
    const paramsToStrip = [
      '__branch_flow_type',
      '__branch_flow_id',
      '__branch_mobile_deepview_type',
      '_referrer',
    ];
    for (const p of paramsToStrip) {
      parsed.searchParams.delete(p);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Branch Deepview pages embed the app launch URL in two places:
 * 1. `<a class="action" href="{scheme}{path}?_branch_referrer=...">`
 * 2. `window.top.location = validateProtocol("{scheme}{path}?...")`
 *
 * The scheme may be "metamask://", "https://link.metamask.io/", or literally
 * "null" (when the Branch link has no URI scheme configured). This function
 * extracts the deeplink path from these patterns.
 */
function extractDeepviewPath(html: string): string | undefined {
  const launchHref =
    html.match(/<a[^>]*class="action"[^>]*href="([^"?]+)/)?.[1] ??
    html.match(/window\.top\.location\s*=\s*validateProtocol\("([^"?]+)/)?.[1];

  if (!launchHref) return undefined;

  if (launchHref.startsWith('null') && launchHref.length > 4) {
    return launchHref.substring(4);
  }

  if (launchHref.startsWith('metamask://')) {
    return launchHref.replace('metamask://', '');
  }

  try {
    const parsed = new URL(launchHref);
    if (
      parsed.hostname === AppConstants.MM_IO_UNIVERSAL_LINK_HOST ||
      parsed.hostname === AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST
    ) {
      return parsed.pathname.replace(/^\//, '');
    }
  } catch {
    // not a full URL — treat it as a raw path
    if (/^[a-zA-Z0-9]/.test(launchHref)) {
      return launchHref;
    }
  }

  return undefined;
}

/**
 * When the Branch SDK fails to resolve a short link (returns +non_branch_link),
 * fetch the short link URL directly and follow redirects. Branch's server will
 * redirect to the destination URL (e.g. https://link.metamask.io/buy) which
 * contains the routable path. If the redirect lands on a MetaMask host, use it.
 * Otherwise, try to extract $deeplink_path from the HTML response body.
 */
export async function resolveBranchShortLink(
  shortLinkUrl: string,
): Promise<string | undefined> {
  try {
    const cleanUrl = stripBranchDeepviewParams(shortLinkUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(cleanUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'MetaMask-Mobile/1.0 (deep-link-resolver)' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const finalUrl = response.url;

    try {
      const finalHostname = new URL(finalUrl).hostname;
      if (
        finalHostname === AppConstants.MM_IO_UNIVERSAL_LINK_HOST ||
        finalHostname === AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST
      ) {
        return finalUrl;
      }
    } catch {
      // ignore URL parse errors on finalUrl
    }

    const body = await response.text();

    const deepLinkPathMatch =
      body.match(/\$deeplink_path['":\s]+['"]([^'"]+)['"]/) ??
      body.match(/deeplink_path['":\s]+['"]([^'"]+)['"]/);

    if (deepLinkPathMatch?.[1]) {
      const path = deepLinkPathMatch[1];
      return `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${path.replace(/^\//, '')}`;
    }

    const deepviewPath = extractDeepviewPath(body);
    if (deepviewPath) {
      return `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${deepviewPath.replace(/^\//, '')}`;
    }
    return undefined;
  } catch (error) {
    Logger.error(
      error as Error,
      `Error resolving Branch short link: ${shortLinkUrl}`,
    );
    return undefined;
  }
}

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
      } else {
        instance.cachedBranchParams = undefined;
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
        } else {
          const nonBranchLink = latestParams?.['+non_branch_link'] as
            | string
            | undefined;
          if (nonBranchLink && isBranchDomainUrl(nonBranchLink)) {
            const resolved = await resolveBranchShortLink(nonBranchLink);
            if (resolved) {
              handleDeeplink({ uri: resolved });
            }
          }
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
        return;
      }
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

      if (rewritten) {
        getBranchDeeplink(rewritten);
      } else if (opts.uri && !isBranchDomainUrl(opts.uri)) {
        getBranchDeeplink(opts.uri);
      } else if (
        opts.uri &&
        isBranchDomainUrl(opts.uri) &&
        opts.params?.['+non_branch_link'] &&
        isBranchDomainUrl(opts.params['+non_branch_link'] as string)
      ) {
        const nonBranchLink = opts.params['+non_branch_link'] as string;
        resolveBranchShortLink(nonBranchLink)
          .then((resolved) => {
            if (resolved) {
              getBranchDeeplink(resolved);
            }
          })
          .catch((err) => {
            Logger.error(
              err as Error,
              'Error resolving Branch short link in subscribe',
            );
          });
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
