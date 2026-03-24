import StorageWrapper from '../../store/storage-wrapper';
import { resolveRouteFromBranchParams } from './DeeplinkManager';

const BRANCH_DEBUG_KEY = 'BRANCH_DEBUG_PARAMS';

export async function writeBranchDebug(label: string, data: unknown) {
  try {
    const entry = `[${new Date().toISOString()}] ${label}\n${JSON.stringify(data, null, 2)}\n\n`;
    const prev = (await StorageWrapper.getItem(BRANCH_DEBUG_KEY)) ?? '';
    await StorageWrapper.setItem(BRANCH_DEBUG_KEY, prev + entry);
  } catch {
    // best-effort — never block deep link handling
  }
}

/**
 * Reads link metadata from the Branch Deep Link API (GET /v1/url).
 * Returns the parsed JSON body (containing data.$deeplink_path etc.)
 * or undefined on failure.
 */
export async function fetchBranchLinkData(
  shortUrl: string,
): Promise<Record<string, unknown> | undefined> {
  const branchKey =
    process.env.MM_BRANCH_KEY_LIVE ?? process.env.MM_BRANCH_KEY_TEST;
  if (!branchKey) {
    await writeBranchDebug('NETWORK fetchBranchLinkData', {
      error: 'No Branch key available (MM_BRANCH_KEY_LIVE / _TEST)',
    });
    return undefined;
  }
  try {
    const qs = new URLSearchParams({
      url: shortUrl,
      branch_key: branchKey,
    });
    const response = await fetch(
      `https://api2.branch.io/v1/url?${qs.toString()}`,
    );
    const body = await response.text();
    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = JSON.parse(body);
    } catch {
      // non-JSON response
    }
    await writeBranchDebug('NETWORK fetchBranchLinkData', {
      shortUrl,
      httpStatus: response.status,
      body: parsed ?? body,
    });
    return response.ok ? parsed : undefined;
  } catch (err) {
    await writeBranchDebug('NETWORK fetchBranchLinkData', {
      shortUrl,
      error: String(err),
    });
    return undefined;
  }
}

/**
 * When the Branch SDK fails to resolve a short link (NativeLink returns
 * +clicked_branch_link:false), we fall back to the Branch HTTP API.
 * The response's `data` object contains $deeplink_path etc.
 */
export async function resolveShortLinkViaApi(
  shortUrl: string,
): Promise<string | undefined> {
  const linkData = await fetchBranchLinkData(shortUrl);
  if (!linkData) return undefined;

  const data =
    typeof linkData.data === 'string'
      ? (() => {
          try {
            return JSON.parse(linkData.data as string);
          } catch {
            return undefined;
          }
        })()
      : linkData.data;

  if (data && typeof data === 'object') {
    const route = resolveRouteFromBranchParams(data as Record<string, unknown>);
    if (route) return route;
  }

  // Top-level fields may also contain routing info (varies by API version)
  return resolveRouteFromBranchParams(linkData);
}
