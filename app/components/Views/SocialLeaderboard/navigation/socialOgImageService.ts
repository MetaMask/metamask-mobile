import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';

export type SocialOgImageTheme = 'mono' | 'blue' | 'purple' | 'orange';

/** `trade` body for `POST /api/v1/og-images` (Trade A card). */
export interface SocialOgTradeCard {
  handle: string;
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
  promoCode?: string;
  theme?: SocialOgImageTheme;
}

/** `profile` body for `POST /api/v1/og-images` (Profile A card). */
export interface SocialOgProfileCard {
  handle: string;
  avatarUrl?: string;
  address?: string;
  subtitle?: string;
  pnl30dUsd: number;
  /** 0–100. */
  winRatePct: number;
  tradeCount: number;
  bestTradeUsd: number;
  followers: number;
  /** 2–200 values, oldest first. */
  pnlSeries: number[];
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

const socialApiBase = (): string =>
  AppConstants.SOCIAL_API_URL.replace(/\/$/, '');

/**
 * Static card the API serves for links that have no card of their own.
 * Used when generating a card fails.
 */
export const getSocialOgDefaultImageUrl = (): string =>
  `${socialApiBase()}/api/v1/og-images/default.jpg`;

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
  const token = await Engine.controllerMessenger.call(
    'AuthenticationController:getBearerToken',
  );
  const response = await fetch(`${socialApiBase()}/api/v1/og-images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) {
    throw new SocialOgImageHttpError(response.status);
  }
  return readImageUrl(await response.json());
};
