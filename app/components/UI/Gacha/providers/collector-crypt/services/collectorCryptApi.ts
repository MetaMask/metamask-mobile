import { array, is, type Infer } from '@metamask/superstruct';
import {
  COLLECTOR_CRYPT_API_URL,
  COLLECTOR_CRYPT_CARDS_API_URL,
  COLLECTOR_CRYPT_RARITIES,
  COLLECTOR_CRYPT_TIMINGS,
} from '../constants';
import {
  CcBuybackAvailableStruct,
  CcBuybackCheckStruct,
  CcBuybackResponseStruct,
  CcGeneratePackResponseStruct,
  CcMachineStruct,
  CcMachinesResponseStruct,
  CcOpenPackAwardedStruct,
  CcOpenPackPendingStruct,
  CcOpenPackResponseStruct,
  CcPackStatusStruct,
  CcStatusStruct,
  CcSubmitTransactionResponseStruct,
  CcWalletCardStruct,
  CcWalletCardsResponseStruct,
  type CcMachine,
  type CcNftWon,
  type CcPackStatus,
  type CcStatus,
  type CcWalletCard,
} from '../schemas';
import type { CollectorCryptErrorCode, CollectorCryptRarity } from '../types';
import { parseInsuredValue, parseTimestamp } from '../utils/format';
import { createCollectorCryptError } from './errors';
import {
  defaultFetch,
  getErrorBodyMessage,
  parseItems,
  parseResponse,
  requestJson,
  toQueryString,
  trimBaseUrl,
  type HttpResult,
} from '../../../services/http';

const WALLET_CARDS_PAGE_SIZE = 96;
export const WALLET_CARDS_MAX_PAGES = 20;

export interface CollectorCryptApiOptions {
  /** Defaults to `COLLECTOR_CRYPT_API_URL`. */
  baseUrl?: string;
  /** Defaults to `COLLECTOR_CRYPT_CARDS_API_URL`. */
  cardsBaseUrl?: string;
  /** Sent as `x-api-key` to the Gacha API when set. */
  apiKey?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface GeneratedPack {
  memo: string;
  /** Base64 wire transaction, partially signed by CollectorCrypt. */
  transaction: string;
}

export interface SubmittedTransaction {
  signature: string;
  confirmationStatus: 'confirmed' | 'finalized' | 'submitted';
}

export type OpenPackResult =
  | {
      status: 'awarded';
      mint: string;
      transactionSignature: string;
      nft: CcNftWon;
      rarity?: CollectorCryptRarity;
      /** Base units. */
      buybackAmount?: string;
    }
  | { status: 'pending'; code: 'WAITING_FOR_WEBHOOK' | 'SEND_PENDING' };

export interface PackStatus {
  memo: string | null;
  /** `pack.status === 'confirmed' || pack.webhook_received`. */
  isPaid: boolean;
  /** `send.status === 'confirmed' || send.webhook_sent || send.transaction_signature === 'turbomode'`. */
  isDelivered: boolean;
  isRefunded: boolean;
  mint?: string;
  rarity?: CollectorCryptRarity;
  /** Whole USD. */
  insuredValue?: number;
  /** Epoch ms of `pack.created_at`. */
  createdAt?: number;
}

export type BuybackAvailability =
  | { available: true; amount: string }
  | { available: false };

export interface BuybackTransaction {
  /** Base64 wire transaction, partially signed by CollectorCrypt. */
  transaction: string;
  /** Refund, base units. */
  amount: string;
  memo: string;
}

export interface BuybackCheck {
  exists: boolean;
  isComplete: boolean;
  signature?: string;
  /** Base units. */
  amount?: string;
}

export interface CollectorCryptApi {
  /** GET /machines (all machines, including private and closed ones). */
  getMachines(): Promise<CcMachine[]>;
  /** GET /status */
  getStatus(): Promise<CcStatus>;
  /** POST /generatePack */
  generatePack(params: {
    playerAddress: string;
    packType: string;
  }): Promise<GeneratedPack>;
  /** POST /submitTransaction */
  submitTransaction(params: {
    signedTransaction: string;
  }): Promise<SubmittedTransaction>;
  /** POST /openPack */
  openPack(params: { memo: string }): Promise<OpenPackResult>;
  /** GET /pack/status?memo= */
  getPackStatus(params: { memo: string }): Promise<PackStatus>;
  /** GET /buyback/available?nft= */
  getBuybackAvailability(params: {
    mint: string;
  }): Promise<BuybackAvailability>;
  /** POST /buyback */
  createBuyback(params: {
    playerAddress: string;
    mint: string;
  }): Promise<BuybackTransaction>;
  /** GET /buyback/check?memo= */
  checkBuyback(params: { memo: string }): Promise<BuybackCheck>;
  /** GET {cardsBaseUrl}/cards/{address}/, 404 -> []. */
  getWalletCards(params: { address: string }): Promise<CcWalletCard[]>;
}

/** Endpoint-specific status mapping, `undefined` falls back to the defaults. */
type StatusOverride = (
  status: number,
) => { code: CollectorCryptErrorCode; retryable?: boolean } | undefined;

const PRIZE_TIER_RARITY: Record<number, CollectorCryptRarity> = {
  1: 'epic',
  2: 'rare',
  3: 'uncommon',
  4: 'common',
};

/** `Epic` -> `epic`, unknown -> undefined. */
export const toRarity = (value: unknown): CollectorCryptRarity | undefined => {
  const lower = typeof value === 'string' ? value.toLowerCase() : undefined;
  return COLLECTOR_CRYPT_RARITIES.find((rarity) => rarity === lower);
};

/** Base units sent as number or numeric string -> canonical decimal string. */
export const toBaseUnits = (value: unknown): string | undefined => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0
      ? String(value)
      : undefined;
  }
  if (typeof value === 'string' && /^\d+$/u.test(value.trim())) {
    return BigInt(value.trim()).toString();
  }
  return undefined;
};

const CONFIRMATION_STATUSES: readonly SubmittedTransaction['confirmationStatus'][] =
  ['confirmed', 'finalized', 'submitted'];

const toConfirmationStatus = (
  value: unknown,
): SubmittedTransaction['confirmationStatus'] =>
  CONFIRMATION_STATUSES.find((status) => status === value) ?? 'submitted';

/** Maps a non-2xx HTTP result to a `CollectorCryptError`. */
const toHttpError = (
  result: HttpResult,
  context: string,
  override?: StatusOverride,
) => {
  const { status } = result;
  const message = `${context}: ${getErrorBodyMessage(result.body) ?? `HTTP ${status}`}`;
  if (status === 429 || status === 503) {
    return createCollectorCryptError({
      code: 'RATE_LIMITED',
      retryable: true,
      status,
      message,
    });
  }
  const mapped = override?.(status);
  if (mapped) {
    return createCollectorCryptError({ ...mapped, status, message });
  }
  return createCollectorCryptError({
    code: 'UNKNOWN',
    retryable: status >= 500,
    status,
    message,
  });
};

// ---------- Response mappers (pure) ----------

const toOpenPackResult = (
  body: Infer<typeof CcOpenPackResponseStruct>,
): OpenPackResult => {
  if (is(body, CcOpenPackPendingStruct)) {
    return { status: 'pending', code: body.code };
  }
  const awarded: Infer<typeof CcOpenPackAwardedStruct> = body;
  const rarity = toRarity(awarded.rarity);
  const buybackAmount = toBaseUnits(awarded.buybackAmount);
  return {
    status: 'awarded',
    mint: awarded.nft_address,
    transactionSignature: awarded.transactionSignature,
    nft: awarded.nftWon,
    ...(rarity ? { rarity } : {}),
    ...(buybackAmount ? { buybackAmount } : {}),
  };
};

/** Maps the raw `pack/status` payload. Exported for tests and callers. */
export const toPackStatus = (body: CcPackStatus): PackStatus => {
  const { pack, send } = body;
  const mint = send?.nft_address ?? undefined;
  const rarity =
    typeof send?.prize_tier === 'number'
      ? PRIZE_TIER_RARITY[send.prize_tier]
      : undefined;
  const insuredValue = parseInsuredValue(send?.insured_value);
  const createdAt = parseTimestamp(pack?.created_at);
  return {
    memo: body.memo ?? null,
    isPaid: pack?.status === 'confirmed' || pack?.webhook_received === true,
    isDelivered:
      send?.status === 'confirmed' ||
      send?.webhook_sent === true ||
      send?.transaction_signature === 'turbomode',
    isRefunded: pack?.refunded === true,
    ...(mint ? { mint } : {}),
    ...(rarity ? { rarity } : {}),
    ...(insuredValue === undefined ? {} : { insuredValue }),
    ...(createdAt === undefined ? {} : { createdAt }),
  };
};

const toBuybackAvailability = (
  body: Infer<typeof CcBuybackAvailableStruct>,
): BuybackAvailability => {
  const amount = toBaseUnits(body.amount);
  return body.available && amount && amount !== '0'
    ? { available: true, amount }
    : { available: false };
};

const toBuybackCheck = (
  body: Infer<typeof CcBuybackCheckStruct>,
): BuybackCheck => {
  const amount = toBaseUnits(body.buybackAmount);
  const signature = body.transactionSignature ?? undefined;
  return {
    exists: body.exists,
    isComplete: body.exists && body.status === 'complete',
    ...(signature ? { signature } : {}),
    ...(amount ? { amount } : {}),
  };
};

/** Cards whose owner is known and differs from the address are stale. */
const isOwnedBy = (address: string) => (card: CcWalletCard) =>
  !card.owner?.wallet || card.owner.wallet === address;

// ---------- Factory ----------

/** Creates the CollectorCrypt Gacha + cards API client. */
export const createCollectorCryptApi = ({
  baseUrl = COLLECTOR_CRYPT_API_URL,
  cardsBaseUrl = COLLECTOR_CRYPT_CARDS_API_URL,
  apiKey,
  fetch: fetchFn = defaultFetch,
  timeoutMs = COLLECTOR_CRYPT_TIMINGS.REQUEST_TIMEOUT,
}: CollectorCryptApiOptions = {}): CollectorCryptApi => {
  const gachaUrl = trimBaseUrl(baseUrl);
  const cardsUrl = trimBaseUrl(cardsBaseUrl);
  const authHeaders: Record<string, string> = apiKey
    ? { 'x-api-key': apiKey }
    : {};

  /** Calls the Gacha API, throws on non-2xx, returns the raw body. */
  const callGacha = async ({
    path,
    method = 'GET',
    body,
    override,
  }: {
    path: string;
    method?: 'GET' | 'POST';
    body?: unknown;
    override?: StatusOverride;
  }): Promise<unknown> => {
    const context = `${method} ${path.split('?')[0]}`;
    const result = await requestJson({
      fetch: fetchFn,
      url: `${gachaUrl}${path}`,
      timeoutMs,
      method,
      headers: authHeaders,
      body,
    });
    if (!result.ok) {
      throw toHttpError(result, context, override);
    }
    return result.body;
  };

  const getMachines = async (): Promise<CcMachine[]> => {
    const body = parseResponse(
      CcMachinesResponseStruct,
      await callGacha({ path: '/machines' }),
      'GET /machines',
    );
    return parseItems(CcMachineStruct, body.machines);
  };

  const getStatus = async (): Promise<CcStatus> =>
    parseResponse(
      CcStatusStruct,
      await callGacha({ path: '/status' }),
      'GET /status',
    );

  const generatePack = async ({
    playerAddress,
    packType,
  }: {
    playerAddress: string;
    packType: string;
  }): Promise<GeneratedPack> => {
    const body = parseResponse(
      CcGeneratePackResponseStruct,
      await callGacha({
        path: '/generatePack',
        method: 'POST',
        body: { playerAddress, packType },
        override: (status) =>
          status === 500 ? { code: 'MACHINE_UNAVAILABLE' } : undefined,
      }),
      'POST /generatePack',
    );
    return { memo: body.memo, transaction: body.transaction };
  };

  const submitTransaction = async ({
    signedTransaction,
  }: {
    signedTransaction: string;
  }): Promise<SubmittedTransaction> => {
    const body = parseResponse(
      CcSubmitTransactionResponseStruct,
      await callGacha({
        path: '/submitTransaction',
        method: 'POST',
        body: { signedTransaction },
        override: (status) => ({
          code: 'SUBMIT_FAILED',
          retryable: status >= 500,
        }),
      }),
      'POST /submitTransaction',
    );
    if (body.success === false) {
      throw createCollectorCryptError({
        code: 'SUBMIT_FAILED',
        message: 'POST /submitTransaction: success false',
      });
    }
    return {
      signature: body.signature,
      confirmationStatus: toConfirmationStatus(body.confirmationStatus),
    };
  };

  const openPack = async ({ memo }: { memo: string }) =>
    toOpenPackResult(
      parseResponse(
        CcOpenPackResponseStruct,
        await callGacha({
          path: '/openPack',
          method: 'POST',
          body: { memo },
          override: (status) => {
            if (status === 404) {
              return { code: 'OPEN_PENDING', retryable: true };
            }
            return status === 400 ? { code: 'NOT_FOUND' } : undefined;
          },
        }),
        'POST /openPack',
      ),
    );

  const getPackStatus = async ({ memo }: { memo: string }) =>
    toPackStatus(
      parseResponse(
        CcPackStatusStruct,
        await callGacha({ path: `/pack/status${toQueryString({ memo })}` }),
        'GET /pack/status',
      ),
    );

  const getBuybackAvailability = async ({ mint }: { mint: string }) =>
    toBuybackAvailability(
      parseResponse(
        CcBuybackAvailableStruct,
        await callGacha({
          path: `/buyback/available${toQueryString({ nft: mint })}`,
        }),
        'GET /buyback/available',
      ),
    );

  const createBuyback = async ({
    playerAddress,
    mint,
  }: {
    playerAddress: string;
    mint: string;
  }): Promise<BuybackTransaction> => {
    const body = parseResponse(
      CcBuybackResponseStruct,
      await callGacha({
        path: '/buyback',
        method: 'POST',
        body: { playerAddress, nftAddress: mint },
        override: (status) =>
          status === 400 ? { code: 'BUYBACK_UNAVAILABLE' } : undefined,
      }),
      'POST /buyback',
    );
    const amount = toBaseUnits(body.refundAmount);
    if (!amount) {
      throw createCollectorCryptError({
        code: 'INVALID_RESPONSE',
        message: 'POST /buyback: invalid refundAmount',
      });
    }
    return { transaction: body.serializedTransaction, amount, memo: body.memo };
  };

  const checkBuyback = async ({ memo }: { memo: string }) =>
    toBuybackCheck(
      parseResponse(
        CcBuybackCheckStruct,
        await callGacha({ path: `/buyback/check${toQueryString({ memo })}` }),
        'GET /buyback/check',
      ),
    );

  const getWalletCards = async ({
    address,
  }: {
    address: string;
  }): Promise<CcWalletCard[]> => {
    const context = 'GET /cards';
    const byMint = new Map<string, CcWalletCard>();
    for (let page = 1; page <= WALLET_CARDS_MAX_PAGES; page++) {
      const result = await requestJson({
        fetch: fetchFn,
        url: `${cardsUrl}/cards/${encodeURIComponent(address)}/${toQueryString({
          page,
          step: WALLET_CARDS_PAGE_SIZE,
          orderBy: 'dateDesc',
        })}`,
        timeoutMs,
      });
      if (result.status === 404 && page === 1) {
        return [];
      }
      if (!result.ok) {
        throw toHttpError(result, context);
      }
      const body = parseResponse(
        CcWalletCardsResponseStruct,
        result.body,
        context,
      );
      const previousSize = byMint.size;
      // Reconciliation needs a complete holdings list, including metadata.
      const cards = parseResponse(
        array(CcWalletCardStruct),
        body.filterNFtCard,
        context,
      );
      for (const card of cards) {
        byMint.set(card.nftAddress, card);
      }
      const hasMore =
        body.totalPages === undefined || body.totalPages === null
          ? body.filterNFtCard.length >= WALLET_CARDS_PAGE_SIZE
          : page < body.totalPages;
      if (!hasMore) {
        return [...byMint.values()].filter(isOwnedBy(address));
      }
      if (byMint.size === previousSize) {
        break;
      }
    }
    // Reconciliation must never treat an incomplete collection as exhaustive.
    throw createCollectorCryptError({
      code: 'INVALID_RESPONSE',
      retryable: true,
      message: `${context}: incomplete pagination`,
    });
  };

  return {
    getMachines,
    getStatus,
    generatePack,
    submitTransaction,
    openPack,
    getPackStatus,
    getBuybackAvailability,
    createBuyback,
    checkBuyback,
    getWalletCards,
  };
};
