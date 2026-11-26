import { Platform } from 'react-native';
import { isSupportedAction } from '../types/deepLink.types';
import { isMetaMaskUniversalLink } from '../util/deeplinks';

export const BRANCH_SHORTLINK_FALLBACK_MS = 1500;
const BRANCH_RESOLUTION_WINDOW_MS = 5000;

/**
 * Returns true when a universal link on a MetaMask Branch host has a first path
 * segment the deeplink pipeline does not route (for example `invite-perps` or
 * `1WkF6GmE40b`), meaning it is likely a Branch short link whose destination
 * arrives asynchronously via Branch `$deeplink_path`.
 */
function isPendingBranchShortlink(url: string): boolean {
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
 * Coordinates Android dual delivery for unresolved Branch short links.
 *
 * On Android, React Native `Linking` receives the raw App Link intent before
 * Branch resolves short-link aliases (such as `link.metamask.io/invite-home`
 * or `metamask.app.link/1WkF6GmE40b`). This gate holds unrouted paths on
 * Branch hosts so Branch delivers the resolved `$deeplink_path` first instead
 * of flashing the invalid-link modal, while keeping a fallback timer for
 * offline or 404 paths.
 *
 * Exact-URI duplicate suppression for already-resolved links lives downstream
 * in `handlers/handleDeeplink.ts`.
 */
export class AndroidShortlinkGate {
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingKey: string | null = null;
  private lastBranchResolvedKey: string | null = null;
  private lastBranchResolvedAt = 0;
  private readonly dispatch: (uri: string) => void;

  constructor(dispatch: (uri: string) => void) {
    this.dispatch = dispatch;
  }

  private clearPending(): void {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.pendingKey = null;
  }

  handleLinkingUrl(url: string): void {
    if (Platform.OS === 'android' && isPendingBranchShortlink(url)) {
      if (
        this.lastBranchResolvedKey === getShortlinkMatchKey(url) &&
        Date.now() - this.lastBranchResolvedAt < BRANCH_RESOLUTION_WINDOW_MS
      ) {
        return;
      }
      this.clearPending();
      this.pendingKey = getShortlinkMatchKey(url);
      this.pendingTimer = setTimeout(() => {
        this.pendingTimer = null;
        this.pendingKey = null;
        this.dispatch(url);
      }, BRANCH_SHORTLINK_FALLBACK_MS);
      return;
    }

    this.clearPending();
    this.dispatch(url);
  }

  /**
   * Records that Branch reported a URI so a later Android intent for the same
   * link is not replayed. Only the URI matching the currently held short link
   * cancels its fallback; unrelated or stale Branch events (a cached INIT or
   * old referring link) must not consume another link's fallback window.
   */
  recordBranchResolution(rawUri?: string): void {
    if (!rawUri) {
      return;
    }

    const matchKey = getShortlinkMatchKey(rawUri);
    if (this.pendingKey === matchKey) {
      this.clearPending();
    }

    this.lastBranchResolvedKey = matchKey;
    this.lastBranchResolvedAt = Date.now();
  }
}
