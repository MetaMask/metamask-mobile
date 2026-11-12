import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import { logSocialOgShare } from './socialOgShareLog';
import { SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL } from './socialShareOpenGraph';

export type SocialOgImageTheme = 'mono' | 'blue' | 'purple' | 'orange';

/** `trade` body for `POST /api/v1/og-images` (Trade A card). */
export interface SocialOgTradeCard {
  /** Drawn with a leading `@`. */
  handle: string;
  /** `https:` image or `foxicon://{variant}/{background}`. */
  avatarUrl?: string;
  market: string;
  marketIconUrl?: string;
  side: 'Long' | 'Short';
  leverage?: number;
  status: 'open' | 'closed';
  /** Epoch milliseconds. */
  closedAt?: number;
  pnlUsd: number;
  pnlPct: number;
  entryPrice: number;
  exitPrice?: number;
  markPrice?: number;
  /** 2–200 prices, oldest first. */
  series: number[];
  entryIndex?: number;
  exitIndex?: number;
  showDollar: boolean;
  /** The sharer's referral code, drawn as the "Code" chip. Omitted without one. */
  promoCode?: string;
  theme?: SocialOgImageTheme;
}

/** `profile` body for `POST /api/v1/og-images` (Profile A card). */
export interface SocialOgProfileCard {
  /** Drawn with a leading `@`. */
  handle: string;
  /** `https:` image or `foxicon://{variant}/{background}`. */
  avatarUrl?: string;
  address?: string;
  subtitle?: string;
  /** Omitted when the trader has no 30-day data; the card draws "—". */
  pnl30dUsd?: number;
  /** 0–100. */
  winRatePct: number;
  tradeCount: number;
  bestTradeUsd: number;
  followers: number;
  /** The sharer's referral code, drawn as the "Code" chip. Omitted without one. */
  promoCode?: string;
  theme?: SocialOgImageTheme;
}

export type SocialOgImageRequest =
  | {
      kind: 'trade';
      trade: SocialOgTradeCard;
      traderId: string;
      positionId: string;
    }
  | { kind: 'profile'; profile: SocialOgProfileCard; traderId: string }
  | { kind: 'generic'; theme?: SocialOgImageTheme };

/** Non-2xx from `POST /api/v1/og-images`. The body is not kept: it can echo card data. */
export class SocialOgImageHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Social og-image request failed: ${status}`);
    this.name = 'SocialOgImageHttpError';
    this.status = status;
  }
}

/** The social API for this build (`SOCIAL_API_URL`), which serves og-images. */
const socialApiBase = (): string =>
  AppConstants.SOCIAL_API_URL.replace(/\/$/, '');

/**
 * Static card the API serves for links that have no card of their own.
 * Used when generating a card fails.
 */
export const getSocialOgDefaultImageUrl = (): string =>
  SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL;

const readImageUrl = (body: unknown): string => {
  const imageUrl =
    body && typeof body === 'object' && 'imageUrl' in body
      ? (body as { imageUrl: unknown }).imageUrl
      : undefined;
  if (typeof imageUrl !== 'string') {
    throw new Error('Social og-image response has no imageUrl');
  }
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new Error('Social og-image imageUrl is not a URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Social og-image imageUrl is not https');
  }
  return imageUrl;
};

/**
 * Renders a share card on the social API and returns its public image URL,
 * exactly as the API sent it. The card is fetched later by Branch and link
 * crawlers, never by the app.
 *
 * Auth is the same bearer token the other social-api calls send.
 */
export const createSocialOgImage = async (
  request: SocialOgImageRequest,
  signal?: AbortSignal,
): Promise<string> => {
  const url = `${socialApiBase()}/api/v1/og-images`;
  const body = JSON.stringify(request);
  const token = await Engine.controllerMessenger.call(
    'AuthenticationController:getBearerToken',
  );
  logSocialOgShare('POST og-images', {
    url,
    kind: request.kind,
    bodyBytes: body.length,
    hasToken: Boolean(token),
  });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
    signal,
  });
  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      // The status alone is enough to fail the request.
    }
    logSocialOgShare('POST og-images failed', {
      status: response.status,
      body: errorBody,
    });
    throw new SocialOgImageHttpError(response.status);
  }
  const json: unknown = await response.json();
  logSocialOgShare('POST og-images response', {
    status: response.status,
    body: json,
  });
  return readImageUrl(json);
};
