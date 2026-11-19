import {
  boolean,
  create,
  defaulted,
  nullable,
  object,
  refine,
  string,
} from '@metamask/superstruct';
import axios from 'axios';
import { ACTIONS } from '../../../../constants/deeplinks';
import { isMetaMaskUniversalLink } from '../../../../core/DeeplinkManager/util/deeplinks';

export interface PerpsOutreachContact {
  email: string;
  telegramUsername: string;
  calendlyUrl: string;
}

export interface PerpsOutreachBanner {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  /**
   * URL opened when the user taps the banner. `null` when the campaign leaves
   * the banner non-interactive. Restricted to the outreach universal link
   * (`https://link.metamask.io/perps-outreach`), which the mobile client parses
   * through `SharedDeeplinkManager` so it flows through the existing deeplink
   * router.
   */
  linkUrl: string | null;
  contact: PerpsOutreachContact | null;
}

interface PerpsOutreachResponse {
  show: boolean;
  banner: PerpsOutreachBanner | null;
}

export interface PerpsOutreachRequest {
  endpoint: string;
  profileId?: string;
  address?: string;
  locale?: string;
  signal?: AbortSignal;
}

type PerpsOutreachQuery = Omit<PerpsOutreachRequest, 'endpoint' | 'signal'>;

const OUTREACH_LINK_PATH = `/${ACTIONS.PERPS_OUTREACH}`;

/**
 * Banner taps parse `linkUrl` with `ORIGIN_PERPS_OUTREACH`, a trusted in-app
 * source that skips the deeplink interstitial. A host allowlist alone would let
 * any other universal-link action (`/dapp`, `/send`, `/swap`) inherit that
 * trust, so the path is pinned to the outreach sheet as well.
 */
const isPerpsOutreachLink = (url: string): boolean => {
  if (!isMetaMaskUniversalLink(url)) {
    return false;
  }

  try {
    return new URL(url).pathname.replace(/\/+$/u, '') === OUTREACH_LINK_PATH;
  } catch {
    return false;
  }
};

const PerpsOutreachLinkSchema = refine(
  string(),
  'PerpsOutreachLink',
  isPerpsOutreachLink,
);

const PerpsOutreachBannerSchema = object({
  id: string(),
  title: string(),
  body: string(),
  imageUrl: string(),
  // Older backend deployments omit `linkUrl` — treat missing as `null` so we
  // never fail validation on a non-breaking backend rollout.
  linkUrl: defaulted(nullable(PerpsOutreachLinkSchema), null),
  // Keep the banner compatible with deployments that predate backend-driven
  // contact configuration. The details sheet intentionally has no static
  // fallback when this field is absent.
  contact: defaulted(
    nullable(
      object({
        email: string(),
        telegramUsername: string(),
        calendlyUrl: string(),
      }),
    ),
    null,
  ),
});

const PerpsOutreachResponseSchema = object({
  show: boolean(),
  banner: nullable(PerpsOutreachBannerSchema),
});

export function buildPerpsOutreachUrl(
  endpoint: string,
  query: PerpsOutreachQuery,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value?.trim()) {
      searchParams.set(key, value.trim());
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

export async function fetchPerpsOutreachBanner({
  endpoint,
  profileId,
  address,
  locale,
  signal,
}: PerpsOutreachRequest): Promise<PerpsOutreachBanner | null> {
  try {
    const response = await axios.get<unknown>(
      buildPerpsOutreachUrl(endpoint, { profileId, address, locale }),
      {
        signal,
        // Server errors are not an answer either: let axios reject them like
        // transport failures so React Query retries and refetches on
        // reconnect instead of caching an empty campaign for the query's
        // `staleTime`. A client error (4xx) is the endpoint answering, so it
        // stays resolvable and maps to the authoritative null below.
        validateStatus: (status) => status < 500,
      },
    );

    if (response.status < 200 || response.status >= 300) {
      return null;
    }

    const result = create(
      response.data,
      PerpsOutreachResponseSchema,
    ) as PerpsOutreachResponse;

    return result.show ? result.banner : null;
  } catch (error) {
    // A cancellation and a transport or server failure never produced an
    // answer: re-throw so React Query retries and refetches on reconnect
    // instead of caching an empty campaign for the query's `staleTime`
    // (`CanceledError` extends `AxiosError`, so `isAxiosError` covers both).
    // Only a response that arrived but cannot be rendered (non-2xx other
    // than 5xx, malformed, or an untrusted link) resolves `null`, the
    // authoritative "no campaign to render" the backend could also have
    // answered with `show: false`.
    if (axios.isAxiosError(error)) {
      throw error;
    }
    return null;
  }
}
