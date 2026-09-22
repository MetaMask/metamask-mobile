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
   * the banner non-interactive. Typically a MetaMask universal link
   * (e.g. `https://link.metamask.io/perps-outreach`), which the mobile client
   * parses through `SharedDeeplinkManager` so it flows through the existing
   * deeplink router.
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

const MetaMaskUniversalLinkSchema = refine(
  string(),
  'MetaMaskUniversalLink',
  isMetaMaskUniversalLink,
);

const PerpsOutreachBannerSchema = object({
  id: string(),
  title: string(),
  body: string(),
  imageUrl: string(),
  // Older backend deployments omit `linkUrl` — treat missing as `null` so we
  // never fail validation on a non-breaking backend rollout.
  linkUrl: defaulted(nullable(MetaMaskUniversalLinkSchema), null),
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
        validateStatus: () => true,
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
  } catch {
    return null;
  }
}
