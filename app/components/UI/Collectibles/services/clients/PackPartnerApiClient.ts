import type { PackPartnerOpeningFilters } from '../../providers/pack-partner/types/openings';
import { array, is, type Infer } from '@metamask/superstruct';
import {
  PACK_PARTNER_API_URL,
  MAX_MULTIPACK_COUNT,
  RECENT_OPENINGS_LIMIT,
  PACK_PARTNER_CARDS_API_URL,
  PACK_PARTNER_RARITIES,
  PACK_PARTNER_TIMINGS,
} from '../../providers/pack-partner/constants/packPartner';
import {
  resolvePackPartnerUrl,
  PACK_PARTNER_API_KEY,
  PACK_PARTNER_ENVIRONMENT,
  resolvePackPartnerApiKey,
} from '../../providers/pack-partner/constants/environment';
import {
  PpBuybackAvailableStruct,
  PpBuybackCheckStruct,
  PpBuybackResponseStruct,
  PpGeneratePackResponseStruct,
  PpGeneratePacksResponseStruct,
  PpMachineStruct,
  PpInventoryResponseStruct,
  PpWinnersResponseStruct,
  type PpWinner,
  PpMachinesResponseStruct,
  PpOpenPackAwardedStruct,
  PpOpenPackPendingStruct,
  PpOpenPackResponseStruct,
  PpPackStatusStruct,
  PpStatusStruct,
  PpSubmitTransactionResponseStruct,
  PpWalletCardStruct,
  PpWalletCardsResponseStruct,
  type PpMachine,
  type PpNftWon,
  type PpPackStatus,
  type PpStatus,
  type PpWalletCard,
} from '../../providers/pack-partner/schemas/packPartner';
import type {
  PackPartnerErrorCode,
  PackPartnerRarity,
} from '../../providers/pack-partner/types/packPartner';
import {
  parseInsuredValue,
  parseTimestamp,
} from '../../providers/pack-partner/utils/format';
import { createPackPartnerError } from '../../providers/pack-partner/services/errors';
import {
  defaultFetch,
  parseItems,
  parseResponse,
  requestJson,
  toQueryString,
  throwIfReadAborted,
  type PackPartnerHttpResult,
} from './PackPartnerApiClient.utils';

export const WALLET_CARDS_PAGE_SIZE = 500;

export interface PackPartnerApiOptions {
  /** Defaults to `PACK_PARTNER_API_URL`. */
  baseUrl?: string;
  /** Defaults to `PACK_PARTNER_CARDS_API_URL`. */
  cardsBaseUrl?: string;
  /** Temporary local devnet access pending the proxy; ignored on mainnet/releases. */
  apiKey?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Read cancellation is local and never changes a submitted operation. */
export interface PackPartnerReadOptions {
  signal?: AbortSignal;
}

/** Purchase prepared by `POST /generatePack`. */
export type GeneratedPack = Infer<typeof PpGeneratePackResponseStruct>;

export interface SubmittedTransaction {
  signature: string;
  confirmationStatus: 'confirmed' | 'finalized' | 'submitted';
}

export type OpenPackResult =
  | {
      status: 'awarded';
      mint: string;
      transactionSignature: string;
      nft: PpNftWon;
      rarity?: PackPartnerRarity;
      /** Base units. */
      buybackAmount?: string;
      automaticSale?: boolean;
    }
  | { status: 'pending'; code: 'WAITING_FOR_WEBHOOK' | 'SEND_PENDING' };

export interface PackStatus {
  paymentSignature?: string;
  memo: string | null;
  /** `pack.status === 'confirmed' || pack.webhook_received`. */
  isPaid: boolean;
  /** `send.status === 'confirmed' || send.webhook_sent || send.transaction_signature === 'turbomode'`. */
  isDelivered: boolean;
  isRefunded: boolean;
  mint?: string;
  rarity?: PackPartnerRarity;
  /** Whole USD. */
  insuredValue?: number;
  /** Epoch ms of `pack.created_at`. */
  createdAt?: number;
  automaticSale?: boolean;
  buybackAmount?: string;
}

export type BuybackAvailability =
  | { available: true; amount: string }
  | { available: false };

export interface BuybackTransaction {
  /** Base64 wire transaction, partially signed by PackPartner. */
  transaction: string;
  /** Refund, base units. */
  amount: string;
  memo: string;
}

export interface BuybackCheck {
  mint?: string;
  address?: string;
  exists: boolean;
  isComplete: boolean;
  signature?: string;
  /** Base units. */
  amount?: string;
}

export interface PackPartnerApi {
  /** GET /getAllWinners: latest public openings, across all wallets and partners. */
  getRecentOpenings(
    params: PackPartnerOpeningFilters,
    options?: PackPartnerReadOptions,
  ): Promise<PpWinner[]>;
  /** GET /getNfts, a page of the machine's live inventory (not wallet holdings). */
  getInventory(
    params: {
      code: string;
      cursor?: string;
    },
    options?: PackPartnerReadOptions,
  ): Promise<Infer<typeof PpInventoryResponseStruct>>;
  /** GET /machines (all machines, including private and closed ones). */
  getMachines(options?: PackPartnerReadOptions): Promise<PpMachine[]>;
  /** GET /status */
  getStatus(options?: PackPartnerReadOptions): Promise<PpStatus>;
  /** POST /generatePack */
  generatePack(params: {
    playerAddress: string;
    packType: string;
    turbo?: boolean;
  }): Promise<GeneratedPack>;
  /** POST /generateYoloPacks: each pack has an independently validated payment. */
  generatePacks(params: {
    playerAddress: string;
    packType: string;
    count: number;
    turbo: boolean;
  }): Promise<{ yoloId: string; transactions: GeneratedPack[] }>;
  /** POST /submitTransaction */
  submitTransaction(params: {
    signedTransaction: string;
  }): Promise<SubmittedTransaction>;
  /** POST /openPack */
  openPack(params: { memo: string }): Promise<OpenPackResult>;
  /** GET /pack/status?memo= */
  getPackStatus(
    params: { memo: string },
    options?: PackPartnerReadOptions,
  ): Promise<PackStatus>;
  /** GET /buyback/available?nft= */
  getBuybackAvailability(
    params: {
      mint: string;
    },
    options?: PackPartnerReadOptions,
  ): Promise<BuybackAvailability>;
  /** POST /buyback */
  createBuyback(params: {
    playerAddress: string;
    mint: string;
  }): Promise<BuybackTransaction>;
  /** GET /buyback/check?memo= */
  checkBuyback(
    params: { memo: string },
    options?: PackPartnerReadOptions,
  ): Promise<BuybackCheck>;
  /** GET {cardsBaseUrl}/cards/{address}/, 404 -> []. */
  getWalletCards(
    params: { address: string },
    options?: PackPartnerReadOptions,
  ): Promise<PpWalletCard[]>;
}

/** Endpoint-specific status mapping, `undefined` falls back to the defaults. */
type StatusOverride = (
  status: number,
) => { code: PackPartnerErrorCode; retryable?: boolean } | undefined;

const PRIZE_TIER_RARITY: Record<number, PackPartnerRarity> = {
  1: 'epic',
  2: 'rare',
  3: 'uncommon',
  4: 'common',
};

/** `Epic` -> `epic`, unknown -> undefined. */
export const toRarity = (value: unknown): PackPartnerRarity | undefined => {
  const lower = typeof value === 'string' ? value.toLowerCase() : undefined;
  return PACK_PARTNER_RARITIES.find((rarity) => rarity === lower);
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

const toPositiveBaseUnits = (value: unknown): string | undefined => {
  const amount = toBaseUnits(value);
  return amount === '0' ? undefined : amount;
};

const CONFIRMATION_STATUSES: readonly SubmittedTransaction['confirmationStatus'][] =
  ['confirmed', 'finalized', 'submitted'];

const toConfirmationStatus = (
  value: unknown,
): SubmittedTransaction['confirmationStatus'] =>
  CONFIRMATION_STATUSES.find((status) => status === value) ?? 'submitted';

/** Maps a non-2xx HTTP result to a `PackPartnerError`. */
const toHttpError = (
  result: PackPartnerHttpResult,
  context: string,
  override?: StatusOverride,
) => {
  const { status } = result;
  if (status === 429 || status === 503) {
    return createPackPartnerError({
      code: 'RATE_LIMITED',
      retryable: true,
      status,
      context,
    });
  }
  const mapped = override?.(status);
  if (mapped) {
    return createPackPartnerError({ ...mapped, status, context });
  }
  return createPackPartnerError({
    code: 'UNKNOWN',
    retryable: status >= 500,
    status,
    context,
  });
};

// ---------- Response mappers (pure) ----------

const toOpenPackResult = (
  body: Infer<typeof PpOpenPackResponseStruct>,
): OpenPackResult => {
  if (is(body, PpOpenPackPendingStruct)) {
    return { status: 'pending', code: body.code };
  }
  const awarded: Infer<typeof PpOpenPackAwardedStruct> = body;
  const rarity = toRarity(awarded.rarity);
  const buybackAmount = toPositiveBaseUnits(awarded.buybackAmount);
  return {
    status: 'awarded',
    mint: awarded.nft_address,
    transactionSignature: awarded.transactionSignature,
    nft: awarded.nftWon,
    ...(rarity ? { rarity } : {}),
    ...(buybackAmount ? { buybackAmount } : {}),
    ...(awarded.code === 'TURBO_MODE_BUYBACK' &&
    rarity === 'common' &&
    buybackAmount
      ? { automaticSale: true }
      : {}),
  };
};

/** Maps the raw `pack/status` payload. Exported for tests and callers. */
export const toPackStatus = (body: PpPackStatus): PackStatus => {
  const { pack, send } = body;
  const mint = send?.nft_address ?? undefined;
  const rarity =
    typeof send?.prize_tier === 'number'
      ? PRIZE_TIER_RARITY[send.prize_tier]
      : undefined;
  const insuredValue = parseInsuredValue(send?.insured_value);
  const createdAt = parseTimestamp(pack?.created_at);
  const settledBuyback = body.buyback?.find(
    (sale) => sale.status === 'confirmed' || sale.webhook_confirmed === true,
  );
  const buybackAmount = toPositiveBaseUnits(settledBuyback?.refund_amount);
  return {
    memo: body.memo ?? null,
    ...(pack?.transaction_signature && {
      paymentSignature: pack.transaction_signature,
    }),
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
    ...(pack?.turbo_mode && rarity === 'common' && buybackAmount
      ? { automaticSale: true, buybackAmount }
      : {}),
  };
};

const toBuybackAvailability = (
  body: Infer<typeof PpBuybackAvailableStruct>,
): BuybackAvailability => {
  const amount = toPositiveBaseUnits(body.amount);
  return body.available && amount
    ? { available: true, amount }
    : { available: false };
};

const toBuybackCheck = (
  body: Infer<typeof PpBuybackCheckStruct>,
): BuybackCheck => {
  const amount = toBaseUnits(body.buybackAmount);
  if (body.buybackAmount != null && amount === undefined) {
    throw createPackPartnerError({
      code: 'INVALID_RESPONSE',
      context: 'GET /buyback/check',
    });
  }
  const signature = body.transactionSignature ?? undefined;
  return {
    ...(body.nft && { mint: body.nft }),
    ...(body.playerWallet && { address: body.playerWallet }),
    exists: body.exists,
    isComplete: body.exists && body.status === 'complete',
    ...(signature ? { signature } : {}),
    ...(amount ? { amount } : {}),
  };
};

/** Cards whose owner is known and differs from the address are stale. */
const isOwnedBy = (address: string) => (card: PpWalletCard) =>
  !card.owner?.wallet || card.owner.wallet === address;

// ---------- Factory ----------

/**
 * Creates the shared PackPartner transport and response-validation boundary.
 * No cache or automatic retry: DataService owns cached UI reads, while Provider
 * owns fresh pre-sign checks and purchase/opening/buyback reconciliation.
 * Generated payment and sale transactions must not become reusable query data.
 */
export const createPackPartnerApi = ({
  baseUrl = PACK_PARTNER_API_URL,
  cardsBaseUrl = PACK_PARTNER_CARDS_API_URL,
  apiKey = PACK_PARTNER_API_KEY,
  fetch: fetchFn = defaultFetch,
  timeoutMs = PACK_PARTNER_TIMINGS.REQUEST_TIMEOUT,
}: PackPartnerApiOptions = {}): PackPartnerApi => {
  const collectiblesUrl = resolvePackPartnerUrl(baseUrl);
  const cardsUrl = resolvePackPartnerUrl(cardsBaseUrl);
  // Apply the same restriction to explicit options as to local environment keys.
  const devnetApiKey = resolvePackPartnerApiKey(
    PACK_PARTNER_ENVIRONMENT,
    apiKey,
    typeof __DEV__ !== 'undefined' && __DEV__,
  );
  const authHeaders: Record<string, string> = devnetApiKey
    ? { 'x-api-key': devnetApiKey }
    : {};

  /** Calls the partner API, throws on non-2xx, returns the raw body. */
  const callCollectibles = async ({
    path,
    method = 'GET',
    body,
    override,
    signal,
  }: {
    path: string;
    method?: 'GET' | 'POST';
    body?: unknown;
    override?: StatusOverride;
    signal?: AbortSignal;
  }): Promise<unknown> => {
    const context = `${method} ${path.split('?')[0]}`;
    if (!collectiblesUrl) {
      throw createPackPartnerError({ code: 'CONFIGURATION_ERROR', context });
    }
    const result = await requestJson({
      fetch: fetchFn,
      url: `${collectiblesUrl}${path}`,
      timeoutMs,
      method,
      headers: authHeaders,
      body,
      signal,
    });
    if (!result.ok) {
      throw toHttpError(result, context, override);
    }
    return result.body;
  };

  const getMachines: PackPartnerApi['getMachines'] = async (options) => {
    const body = parseResponse(
      PpMachinesResponseStruct,
      await callCollectibles({ path: '/machines', signal: options?.signal }),
      'GET /machines',
    );
    return parseItems(PpMachineStruct, body.machines);
  };

  const getRecentOpenings: PackPartnerApi['getRecentOpenings'] = async (
    filters,
    options,
  ) =>
    parseResponse(
      PpWinnersResponseStruct,
      await callCollectibles({
        path: `/getAllWinners${toQueryString({ ...filters, count: filters.count ?? RECENT_OPENINGS_LIMIT })}`,
        signal: options?.signal,
      }),
      'GET /getAllWinners',
    ).data;

  const getInventory: PackPartnerApi['getInventory'] = async (
    { code, cursor },
    options,
  ) => {
    const body = parseResponse(
      PpInventoryResponseStruct,
      await callCollectibles({
        path: `/getNfts${toQueryString({ code, cursor, limit: 20 })}`,
        signal: options?.signal,
      }),
      'GET /getNfts',
    );
    if (body.hasMore && (!body.nextCursor || body.nextCursor === cursor)) {
      throw createPackPartnerError({
        code: 'INVALID_RESPONSE',
        context: 'GET /getNfts',
      });
    }
    return body;
  };

  const getStatus: PackPartnerApi['getStatus'] = async (options) =>
    parseResponse(
      PpStatusStruct,
      await callCollectibles({ path: '/status', signal: options?.signal }),
      'GET /status',
    );

  const generatePack = async ({
    playerAddress,
    packType,
    turbo,
  }: {
    playerAddress: string;
    packType: string;
    turbo?: boolean;
  }): Promise<GeneratedPack> => {
    const body = parseResponse(
      PpGeneratePackResponseStruct,
      await callCollectibles({
        path: '/generatePack',
        method: 'POST',
        body: {
          playerAddress,
          packType,
          ...(turbo === undefined ? {} : { turbo }),
        },
        override: (status) =>
          status === 500 ? { code: 'MACHINE_UNAVAILABLE' } : undefined,
      }),
      'POST /generatePack',
    );
    return { memo: body.memo, transaction: body.transaction };
  };

  const generatePacks: PackPartnerApi['generatePacks'] = async (params) => {
    if (
      !Number.isInteger(params.count) ||
      params.count < 1 ||
      params.count > MAX_MULTIPACK_COUNT
    ) {
      throw createPackPartnerError({
        code: 'INVALID_RESPONSE',
        context: 'POST /generateYoloPacks',
      });
    }
    const body = parseResponse(
      PpGeneratePacksResponseStruct,
      await callCollectibles({
        path: '/generateYoloPacks',
        method: 'POST',
        body: params,
        override: (status) =>
          status === 500 ? { code: 'MACHINE_UNAVAILABLE' } : undefined,
      }),
      'POST /generateYoloPacks',
    );
    if (
      body.count !== params.count ||
      body.transactions.length !== params.count ||
      new Set(body.transactions.map(({ memo }) => memo)).size !== params.count
    ) {
      throw createPackPartnerError({
        code: 'INVALID_RESPONSE',
        context: 'POST /generateYoloPacks',
      });
    }
    return { yoloId: body.yoloId, transactions: body.transactions };
  };

  const submitTransaction = async ({
    signedTransaction,
  }: {
    signedTransaction: string;
  }): Promise<SubmittedTransaction> => {
    const body = parseResponse(
      PpSubmitTransactionResponseStruct,
      await callCollectibles({
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
      throw createPackPartnerError({
        code: 'SUBMIT_FAILED',
        context: 'POST /submitTransaction',
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
        PpOpenPackResponseStruct,
        await callCollectibles({
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

  const getPackStatus: PackPartnerApi['getPackStatus'] = async (
    { memo },
    options,
  ) => {
    const body = parseResponse(
      PpPackStatusStruct,
      await callCollectibles({
        path: `/pack/status${toQueryString({ memo })}`,
        signal: options?.signal,
      }),
      'GET /pack/status',
    );
    // An empty response may describe an unknown operation. Any returned state
    // must be explicitly correlated; a null memo cannot authorize a transition.
    if (
      (body.memo != null && body.memo !== memo) ||
      (body.memo == null &&
        (body.pack != null ||
          body.send != null ||
          Boolean(body.buyback?.length)))
    ) {
      throw createPackPartnerError({
        code: 'INVALID_RESPONSE',
        context: 'GET /pack/status',
      });
    }
    return toPackStatus(body);
  };

  const getBuybackAvailability: PackPartnerApi['getBuybackAvailability'] =
    async ({ mint }, options) =>
      toBuybackAvailability(
        parseResponse(
          PpBuybackAvailableStruct,
          await callCollectibles({
            path: `/buyback/available${toQueryString({ nft: mint })}`,
            signal: options?.signal,
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
      PpBuybackResponseStruct,
      await callCollectibles({
        path: '/buyback',
        method: 'POST',
        body: { playerAddress, nftAddress: mint },
        override: (status) =>
          status === 400 ? { code: 'BUYBACK_UNAVAILABLE' } : undefined,
      }),
      'POST /buyback',
    );
    const amount = toPositiveBaseUnits(body.refundAmount);
    if (amount === undefined) {
      throw createPackPartnerError({
        code: 'INVALID_RESPONSE',
        context: 'POST /buyback',
      });
    }
    return { transaction: body.serializedTransaction, amount, memo: body.memo };
  };

  const checkBuyback: PackPartnerApi['checkBuyback'] = async (
    { memo },
    options,
  ) =>
    toBuybackCheck(
      parseResponse(
        PpBuybackCheckStruct,
        await callCollectibles({
          path: `/buyback/check${toQueryString({ memo })}`,
          signal: options?.signal,
        }),
        'GET /buyback/check',
      ),
    );

  const getWalletCards: PackPartnerApi['getWalletCards'] = async (
    { address },
    options,
  ) => {
    const context = 'GET /cards';
    if (!cardsUrl) {
      throw createPackPartnerError({ code: 'CONFIGURATION_ERROR', context });
    }
    const byMint = new Map<string, PpWalletCard>();
    const seenCursors = new Set<string>();
    let cursor: string | null | undefined;
    do {
      throwIfReadAborted(options?.signal);
      const result = await requestJson({
        fetch: fetchFn,
        url: `${cardsUrl}/cards/${encodeURIComponent(address)}/${toQueryString({
          step: WALLET_CARDS_PAGE_SIZE,
          orderBy: 'dateDesc',
          cursor: cursor ?? undefined,
        })}`,
        timeoutMs,
        signal: options?.signal,
      });
      if (result.status === 404 && cursor === undefined) {
        return [];
      }
      if (!result.ok) {
        throw toHttpError(result, context);
      }
      const body = parseResponse(
        PpWalletCardsResponseStruct,
        result.body,
        context,
      );
      const previousSize = byMint.size;
      // Reconciliation needs a complete holdings list, including metadata.
      const cards = parseResponse(
        array(PpWalletCardStruct),
        body.filterNFtCard,
        context,
      );
      for (const card of cards) {
        byMint.set(card.nftAddress, card);
      }
      // A partial inventory must never be published as an exhaustive collection.
      if (body.nextCursor !== null) {
        if (seenCursors.has(body.nextCursor) || byMint.size === previousSize) {
          throw createPackPartnerError({
            code: 'INVALID_RESPONSE',
            context,
          });
        }
        seenCursors.add(body.nextCursor);
      }
      cursor = body.nextCursor;
    } while (cursor !== null);
    return [...byMint.values()].filter(isOwnedBy(address));
  };

  return {
    getInventory,
    getRecentOpenings,
    getMachines,
    getStatus,
    generatePack,
    generatePacks,
    submitTransaction,
    openPack,
    getPackStatus,
    getBuybackAvailability,
    createBuyback,
    checkBuyback,
    getWalletCards,
  };
};
