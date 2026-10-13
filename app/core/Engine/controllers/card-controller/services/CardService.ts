import { create, isAxiosError, type AxiosInstance } from 'axios';
import Logger from '../../../../../util/Logger';
import { CardProviderIds, type CardProviderId } from '../provider-types';
import type { CardClientInfo, CardLink, CardLinkWriteBody } from '../types';
import { CardApiError } from './BaanxService';
import type { CardApiSupportedRegionsResponse } from './card-supported-regions.types';

const DEFAULT_TIMEOUT_MS = 15_000;

const CARD_LINKS_PATH = '/v1/card/links';

export const CARD_LINK_CLIENT_NOT_ALLOWED = 'CARD_LINK_CLIENT_NOT_ALLOWED';

export function getCardApiErrorBodyCode(error: unknown): string | undefined {
  if (!(error instanceof CardApiError)) return undefined;
  try {
    const code = (JSON.parse(error.responseBody) as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}

const CARD_LINK_PROVIDERS = new Set<string>(Object.values(CardProviderIds));
const CARD_LINK_STATUSES = new Set<string>(['onboarding', 'active', 'closed']);
const CARD_LINK_CLOSED_REASONS = new Set<string>(['migrated', 'terminated']);

const stringOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

// Keeps only the providers, statuses and fields this build knows, so a newer
// API cannot persist a row the app cannot route to.
const toCardLink = (item: unknown): CardLink | null => {
  if (typeof item !== 'object' || item === null) return null;
  const row = item as Record<string, unknown>;
  if (
    typeof row.provider !== 'string' ||
    !CARD_LINK_PROVIDERS.has(row.provider) ||
    typeof row.status !== 'string' ||
    !CARD_LINK_STATUSES.has(row.status) ||
    typeof row.linkedAt !== 'string' ||
    typeof row.updatedAt !== 'string'
  ) {
    return null;
  }
  const closedReason = stringOrNull(row.closedReason);
  return {
    provider: row.provider as CardLink['provider'],
    status: row.status as CardLink['status'],
    linkedAccountRef: stringOrNull(row.linkedAccountRef),
    closedReason:
      closedReason !== null && CARD_LINK_CLOSED_REASONS.has(closedReason)
        ? (closedReason as CardLink['closedReason'])
        : null,
    migratedToProvider: stringOrNull(row.migratedToProvider),
    linkedAt: row.linkedAt,
    updatedAt: row.updatedAt,
  };
};

interface CardServiceRequest {
  path: string;
  method: 'GET' | 'PUT';
  bearerToken?: string;
  body?: unknown;
  withClientHeaders?: boolean;
}

/**
 * HTTP client for the MetaMask Card API (provider-agnostic).
 * Provider-specific Immersve/Baanx APIs live in their own services.
 */
export class CardService {
  private readonly client: AxiosInstance;
  private readonly getBaseUrl: () => string;
  private readonly getClientInfo: () => CardClientInfo;

  constructor({
    getBaseUrl,
    getClientInfo,
  }: {
    getBaseUrl: () => string;
    getClientInfo: () => CardClientInfo;
  }) {
    this.getBaseUrl = getBaseUrl;
    this.getClientInfo = getClientInfo;
    this.client = create({
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  private supportedRegionsPath(providerId: CardProviderId): string {
    return `/v1/providers/${encodeURIComponent(providerId)}/supported-regions`;
  }

  /**
   * Fetches supported regions (incl. legal documents) for a card provider.
   * Public endpoint — no client key or bearer required.
   */
  async getSupportedRegions(
    providerId: CardProviderId,
  ): Promise<CardApiSupportedRegionsResponse> {
    return this.request<CardApiSupportedRegionsResponse>({
      path: this.supportedRegionsPath(providerId),
      method: 'GET',
    });
  }

  async getCardLinks(bearerToken: string): Promise<CardLink[]> {
    const data = await this.request<unknown>({
      path: CARD_LINKS_PATH,
      method: 'GET',
      bearerToken,
      withClientHeaders: true,
    });
    if (!Array.isArray(data)) {
      throw new CardApiError(
        200,
        CARD_LINKS_PATH,
        'Expected an array of card links',
      );
    }
    return data.flatMap((item) => toCardLink(item) ?? []);
  }

  async putCardLink(
    provider: CardProviderId,
    body: CardLinkWriteBody,
    bearerToken: string,
  ): Promise<CardLink> {
    return this.request<CardLink>({
      path: `${CARD_LINKS_PATH}/${encodeURIComponent(provider)}`,
      method: 'PUT',
      bearerToken,
      body,
      withClientHeaders: true,
    });
  }

  private buildHeaders({
    bearerToken,
    withClientHeaders,
  }: CardServiceRequest): Record<string, string> {
    const headers: Record<string, string> = {};
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }
    const info = withClientHeaders ? this.getClientInfo() : undefined;
    if (info) {
      headers['x-metamask-clientproduct'] = info.product;
      headers['x-metamask-clientversion'] = info.version;
      headers['x-metamask-clientplatform'] = info.platform;
      if (info.build) {
        headers['x-metamask-clientbuild'] = info.build;
      }
    }
    return headers;
  }

  private async request<T>(req: CardServiceRequest): Promise<T> {
    const baseURL = this.getBaseUrl();
    const { path, method, body } = req;

    if (!baseURL) {
      throw new CardApiError(0, path, 'Card API base URL is not configured');
    }

    if (__DEV__) {
      Logger.log('[CardService]', 'request', path, { method, baseURL });
    }

    try {
      const response = await this.client.request<T>({
        baseURL,
        url: path,
        method,
        data: body,
        headers: this.buildHeaders(req),
        timeout: DEFAULT_TIMEOUT_MS,
      });

      if (__DEV__) {
        Logger.log('[CardService]', 'response', path, {
          status: response.status,
        });
      }

      return response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        const status =
          error.response?.status ?? (error.code === 'ECONNABORTED' ? 408 : 0);
        const rawData = error.response?.data;
        const responseBody =
          typeof rawData === 'string'
            ? rawData
            : rawData != null
              ? JSON.stringify(rawData)
              : '';
        throw new CardApiError(status, path, responseBody);
      }
      throw error;
    }
  }
}
