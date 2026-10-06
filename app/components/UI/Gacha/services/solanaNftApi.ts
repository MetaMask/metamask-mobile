import { is, validate } from '@metamask/superstruct';

import {
  SolanaNftItemRefStruct,
  SolanaNftItemStruct,
  SolanaNftResponseStruct,
  type SolanaNftItem,
  type SolanaNftItemRef,
} from './solanaNftApi.schemas';
import {
  defaultFetch,
  HttpError,
  getErrorBodyMessage,
  parseResponse,
  requestJson,
  toQueryString,
  trimBaseUrl,
} from './http';

export const SOLANA_NFT_API_URL = 'https://nft.api.cx.metamask.io';
export const SOLANA_NFT_API_VERSION = '1';
const REQUEST_TIMEOUT = 15_000;

/** Safety cap on pagination. */
export const SOLANA_NFT_API_MAX_PAGES = 20;

/**
 * Whether the caller depends on an item. A malformed item the caller depends
 * on rejects the collection; other malformed items are skipped.
 */
export type SolanaNftItemFilter = (item: SolanaNftItemRef) => boolean;

export interface SolanaNftApi {
  /**
   * All valid NFTs returned for the address, across every page, without
   * provider or spam filtering. `bypassCache` appends a cache-busting query
   * parameter. Malformed items are skipped unless `isRequired` returns true
   * for them (default: every item is required).
   */
  getTokens(params: {
    address: string;
    bypassCache?: boolean;
    isRequired?: SolanaNftItemFilter;
  }): Promise<SolanaNftItem[]>;
}

export interface SolanaNftApiOptions {
  /** Defaults to `SOLANA_NFT_API_URL`. */
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Creates the MetaMask NFT API client (Solana tokens). */
export const createSolanaNftApi = ({
  baseUrl = SOLANA_NFT_API_URL,
  fetch: fetchFn = defaultFetch,
  timeoutMs = REQUEST_TIMEOUT,
}: SolanaNftApiOptions = {}): SolanaNftApi => {
  const apiUrl = trimBaseUrl(baseUrl);
  const context = 'GET /solana-tokens';

  /** Fetches one page. */
  const getPage = async ({
    address,
    cursor,
    cacheBuster,
  }: {
    address: string;
    cursor?: string;
    cacheBuster?: number;
  }) => {
    const result = await requestJson({
      fetch: fetchFn,
      url: `${apiUrl}/users/${encodeURIComponent(address)}/solana-tokens${toQueryString(
        { cursor, ts: cacheBuster },
      )}`,
      timeoutMs,
      headers: { Version: SOLANA_NFT_API_VERSION },
    });
    if (!result.ok) {
      throw new HttpError({
        code: result.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN',
        retryable: result.status === 429 || result.status >= 500,
        status: result.status,
        message: `${context}: ${getErrorBodyMessage(result.body) ?? `HTTP ${result.status}`}`,
      });
    }
    const body = parseResponse(SolanaNftResponseStruct, result.body, context);
    if (body.error) {
      // A partial answer would make reconciliation drop owned cards.
      throw new HttpError({
        code: 'UNKNOWN',
        retryable: true,
        message: `${context}: ${typeof body.error === 'string' ? body.error : 'error'}`,
      });
    }
    return body;
  };

  /**
   * Validates one item. A malformed item is skipped unless the caller depends
   * on it: reconciliation needs every item it relies on, not a valid subset.
   */
  const parseItem = (
    item: unknown,
    index: number,
    isRequired: SolanaNftItemFilter,
  ): SolanaNftItem[] => {
    const [error, parsed] = validate(item, SolanaNftItemStruct, {
      coerce: true,
    });
    if (!error) {
      return [parsed];
    }
    if (is(item, SolanaNftItemRefStruct) && !isRequired(item)) {
      return [];
    }
    throw new HttpError({
      code: 'INVALID_RESPONSE',
      message: `${context}: invalid response at "items.${index}.${error.path.join('.')}"`,
      cause: error,
    });
  };

  const getTokens = async ({
    address,
    bypassCache = false,
    isRequired = () => true,
  }: {
    address: string;
    bypassCache?: boolean;
    isRequired?: SolanaNftItemFilter;
  }): Promise<SolanaNftItem[]> => {
    const cacheBuster = bypassCache ? Date.now() : undefined;
    const items: SolanaNftItem[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < SOLANA_NFT_API_MAX_PAGES; page++) {
      const body = await getPage({ address, cursor, cacheBuster });
      items.push(
        ...body.items.flatMap((item, index) =>
          parseItem(item, index, isRequired),
        ),
      );
      if (!body.cursor) {
        cursor = undefined;
        break;
      }
      if (seenCursors.has(body.cursor)) {
        break;
      }
      seenCursors.add(body.cursor);
      cursor = body.cursor;
    }
    if (cursor) {
      throw new HttpError({
        code: 'INVALID_RESPONSE',
        retryable: true,
        message: `${context}: incomplete pagination`,
      });
    }
    const byMint = new Map(
      items.map((item): [string, SolanaNftItem] => [item.token_address, item]),
    );
    return [...byMint.values()];
  };

  return { getTokens };
};
