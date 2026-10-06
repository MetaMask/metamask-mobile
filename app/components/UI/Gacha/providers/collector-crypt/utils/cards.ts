import { hasProperty, isObject } from '@metamask/utils';
import { isEqual } from 'lodash';
import {
  COLLECTOR_CRYPT_COLLECTIONS,
  COLLECTOR_CRYPT_TIMINGS,
  COLLECTOR_CRYPT_UPDATE_AUTHORITY,
} from '../constants';
import type {
  SolanaNftItem,
  SolanaNftItemRef,
} from '../../../services/solanaNftApi.schemas';
import type { CcNftWon, CcWalletCard } from '../schemas';
import type {
  BuybackAvailability,
  OpenPackResult,
  PackStatus,
} from '../services/collectorCryptApi';
import type {
  CollectorCryptBuyback,
  CollectorCryptCard,
  PackOperation,
} from '../types';
import { parseBaseUnits, parseInsuredValue, parseTimestamp } from './format';

type AwardedOpenPackResult = Extract<OpenPackResult, { status: 'awarded' }>;

/** Card fields that come from metadata (as opposed to local bookkeeping). */
type CardDetails = Partial<
  Pick<
    CollectorCryptCard,
    | 'name'
    | 'image'
    | 'mediumImage'
    | 'backImage'
    | 'mediumBackImage'
    | 'grade'
    | 'gradingCompany'
    | 'gradingId'
    | 'insuredValue'
    | 'listedPriceUsd'
    | 'category'
    | 'year'
    | 'set'
  >
>;

/** Reads an attribute value by trait name (case-insensitive). */
type AttributeReader = (traitType: string) => string | undefined;

const UNKNOWN_BUYBACK: CollectorCryptBuyback = { status: 'unknown' };
const BASE_UNITS_PATTERN = /^\d+$/u;

/**
 * Drops keys whose value is undefined, so state stays JSON-clean.
 *
 * @param value - Object to compact.
 * @returns A copy without undefined values.
 */
const compact = <Value extends object>(value: Value): Value =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Value;

/**
 * Normalizes a scalar metadata value to a non-empty string.
 *
 * @param value - Raw value.
 * @returns The trimmed string, or undefined.
 */
const toText = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Builds an attribute reader from `[name, value]` pairs.
 *
 * @param entries - Attribute pairs.
 * @returns The reader.
 */
const createAttributeReader = (
  entries: readonly (readonly [unknown, unknown])[],
): AttributeReader => {
  const values = new Map<string, string>();
  entries.forEach(([name, value]) => {
    const key = toText(name)?.toLowerCase();
    const text = toText(value);
    if (key && text && !values.has(key)) {
      values.set(key, text);
    }
  });
  return (traitType) => values.get(traitType.toLowerCase());
};

/**
 * Card details shared by the NFT API and `openPack` attributes.
 *
 * @param read - Attribute reader.
 * @returns The details found.
 */
const detailsFromAttributes = (read: AttributeReader): CardDetails =>
  compact({
    grade: read('The Grade'),
    gradingCompany: read('Grading Company'),
    gradingId: read('Grading ID'),
    insuredValue: parseInsuredValue(read('Insured Value')),
    category: read('Category'),
    year: read('Year'),
    set: read('Set'),
  });

/**
 * Original photographs and optimized previews from an `openPack` NFT.
 * Only a typed image in the second file is treated as the back.
 *
 * @param nft - `nftWon` payload.
 * @returns The image URLs supplied by CollectorCrypt.
 */
const getNftWonImages = (
  nft: CcNftWon,
): Pick<
  CollectorCryptCard,
  'image' | 'mediumImage' | 'backImage' | 'mediumBackImage'
> => {
  const front = nft.content.files?.[0];
  const secondFile = nft.content.files?.[1];
  const back = toText(secondFile?.mime)?.toLowerCase().startsWith('image/')
    ? secondFile
    : undefined;
  const mediumImage = toText(front?.cc_cdn) ?? toText(front?.cdn_uri);
  const mediumBackImage = toText(back?.cc_cdn) ?? toText(back?.cdn_uri);
  return {
    image:
      toText(front?.uri) ??
      toText(nft.content.links?.image) ??
      mediumImage ??
      toText(nft.image),
    mediumImage,
    backImage: toText(back?.uri) ?? mediumBackImage,
    mediumBackImage,
  };
};

/**
 * Buyback offer included in the `openPack` response, when valid.
 *
 * @param amount - Offer in base units.
 * @param now - Epoch ms.
 * @returns The cached buyback.
 */
const buybackFromAmount = (
  amount: string | undefined,
  now: number,
): CollectorCryptBuyback =>
  amount && BASE_UNITS_PATTERN.test(amount) && BigInt(amount) > 0n
    ? { status: 'available', amount, checkedAt: now }
    : UNKNOWN_BUYBACK;

/**
 * Card built from an awarded `openPack` response.
 *
 * @param result - Awarded result.
 * @param operation - Pack operation that produced it.
 * @param now - Epoch ms.
 * @returns The card.
 */
export const cardFromOpenPack = (
  result: AwardedOpenPackResult,
  operation: PackOperation,
  now: number,
): CollectorCryptCard => {
  const { metadata } = result.nft.content;
  const read = createAttributeReader(
    (metadata.attributes ?? []).map(
      (attribute) => [attribute.trait_type, attribute.value] as const,
    ),
  );
  const details = detailsFromAttributes(read);
  return compact({
    ...details,
    ...getNftWonImages(result.nft),
    mint: result.mint,
    name:
      toText(metadata.json_name) ??
      toText(metadata.name) ??
      read('Card Name') ??
      operation.packName,
    insuredValue:
      details.insuredValue ?? parseInsuredValue(metadata.insuredValue),
    rarity: result.rarity,
    memo: operation.memo,
    packCode: operation.packCode,
    source: 'openPack' as const,
    acquiredAt: now,
    buyback: buybackFromAmount(result.buybackAmount, now),
  });
};

/**
 * Card built from a delivered `pack/status` when `openPack` cannot return the
 * award. The indexers fill in the card metadata on the next sync.
 *
 * @param params - Inputs.
 * @param params.mint - Delivered mint.
 * @param params.status - Pack status.
 * @param params.operation - Pack operation that produced it.
 * @param params.now - Epoch ms.
 * @returns The card.
 */
export const cardFromPackStatus = ({
  mint,
  status,
  operation,
  now,
}: {
  mint: string;
  status: PackStatus;
  operation: PackOperation;
  now: number;
}): CollectorCryptCard =>
  compact({
    mint,
    name: operation.packName,
    insuredValue: status.insuredValue,
    rarity: status.rarity,
    memo: operation.memo,
    packCode: operation.packCode,
    source: 'openPack' as const,
    acquiredAt: now,
    buyback: UNKNOWN_BUYBACK,
  });

/**
 * Whether an NFT API item belongs to CollectorCrypt, from its collection or
 * update authority. Works on malformed items too.
 *
 * @param item - Item envelope.
 * @returns True for a CollectorCrypt card.
 */
export const isCollectorCryptItemRef = (item: SolanaNftItemRef): boolean => {
  const collection = item.nft_token?.onchain_collection_address;
  const inCollection =
    typeof collection === 'string' &&
    COLLECTOR_CRYPT_COLLECTIONS.includes(collection);
  const byAuthority = (item.nft_token?.creators ?? []).some(
    (creator) =>
      isObject(creator) &&
      hasProperty(creator, 'address') &&
      creator.address === COLLECTOR_CRYPT_UPDATE_AUTHORITY,
  );
  return inCollection || byAuthority;
};

/**
 * Whether the NFT API reports the item as held (balance unknown or positive).
 *
 * @param item - NFT API item.
 * @returns True when held.
 */
const isHeld = (item: SolanaNftItem): boolean =>
  typeof item.balance !== 'number' || item.balance > 0;

/** Whether an NFT API item is a CollectorCrypt card still held. */
export const isCollectorCryptItem = (item: SolanaNftItem): boolean =>
  isHeld(item) && isCollectorCryptItemRef(item);

/**
 * Card built from a MetaMask NFT API item. An unknown acquisition date stays
 * zero until reconciliation so first-seen time cannot imply reacquisition.
 *
 * @param item - NFT API item.
 * @returns The card.
 */
export const cardFromNftItem = (item: SolanaNftItem): CollectorCryptCard => {
  const token = item.nft_token;
  const read = createAttributeReader(
    (token.attributes ?? []).map(
      (attribute) => [attribute.key, attribute.value] as const,
    ),
  );
  return compact({
    ...detailsFromAttributes(read),
    mint: item.token_address,
    name: toText(token.name) ?? read('Card Name') ?? item.token_address,
    image: toText(token.image_url) ?? toText(token.media_url),
    source: 'nftApi' as const,
    acquiredAt: parseTimestamp(item.acquired_at) ?? 0,
    buyback: UNKNOWN_BUYBACK,
  });
};

/**
 * Reads a full-size wallet photograph before any medium-size fallback.
 *
 * @param walletCard - Wallet card.
 * @param side - Side of the card.
 * @returns The original image URL, when provided.
 */
const getOriginalWalletImage = (
  walletCard: CcWalletCard,
  side: 'front' | 'back',
): string | undefined =>
  toText(walletCard.images?.[side]) ??
  toText(side === 'front' ? walletCard.frontImage : walletCard.backImage);

/**
 * Reads an active listing denominated in USD/USDC without currency conversion.
 *
 * @param walletCard - Wallet card with its current listing.
 * @returns The asking price, when available.
 */
const getWalletListedPrice = ({
  listing,
}: CcWalletCard): number | undefined => {
  if (
    listing?.status !== 'Active' ||
    (listing.currency !== 'USD' && listing.currency !== 'USDC')
  ) {
    return undefined;
  }
  const price = Number(toText(listing.price));
  return Number.isFinite(price) && price >= 0 ? price : undefined;
};

/**
 * Card details from the CollectorCrypt cards API.
 *
 * @param walletCard - Wallet card.
 * @returns The details found.
 */
const detailsFromWalletCard = (walletCard: CcWalletCard): CardDetails =>
  compact({
    name: toText(walletCard.itemName),
    image:
      getOriginalWalletImage(walletCard, 'front') ??
      toText(walletCard.images?.frontM),
    mediumImage: toText(walletCard.images?.frontM),
    backImage:
      getOriginalWalletImage(walletCard, 'back') ??
      toText(walletCard.images?.backM),
    mediumBackImage: toText(walletCard.images?.backM),
    grade: toText(walletCard.grade),
    gradingCompany: toText(walletCard.gradingCompany),
    insuredValue: parseInsuredValue(walletCard.insuredValue),
    listedPriceUsd: getWalletListedPrice(walletCard),
    category: toText(walletCard.category),
    year: toText(walletCard.year),
    set: toText(walletCard.set),
  });

/**
 * Enriches an indexed card with the CollectorCrypt cards API. CollectorCrypt
 * supplies original photographs, grading and value; the card keeps its name.
 *
 * @param card - Card from the NFT API.
 * @param walletCard - Same mint from the CollectorCrypt cards API.
 * @returns The enriched card.
 */
export const enrichWithWalletCard = (
  card: CollectorCryptCard,
  walletCard: CcWalletCard,
): CollectorCryptCard => {
  const { name, image, backImage, ...details } =
    detailsFromWalletCard(walletCard);
  const hasOwnName = card.name.length > 0 && card.name !== card.mint;
  return compact({
    ...card,
    ...details,
    listedPriceUsd: details.listedPriceUsd,
    name: hasOwnName ? card.name : (name ?? card.name),
    image: getOriginalWalletImage(walletCard, 'front') ?? card.image ?? image,
    backImage:
      getOriginalWalletImage(walletCard, 'back') ?? card.backImage ?? backImage,
  });
};

/**
 * Card built from the CollectorCrypt cards API only (NFT API unavailable).
 * Unknown acquisition dates stay zero until reconciliation.
 *
 * @param walletCard - Wallet card.
 * @returns The card.
 */
export const cardFromWalletCard = (
  walletCard: CcWalletCard,
): CollectorCryptCard => {
  const details = detailsFromWalletCard(walletCard);
  return compact({
    ...details,
    mint: walletCard.nftAddress,
    name: details.name ?? walletCard.nftAddress,
    source: 'collectorCryptApi' as const,
    acquiredAt: parseTimestamp(walletCard.lastTransferredAt) ?? 0,
    buyback: UNKNOWN_BUYBACK,
  });
};

/**
 * Cards reported by the indexers that answered (undefined: none did). The NFT
 * API is authoritative for the mints it returns; the CollectorCrypt cards API
 * enriches them and adds the CollectorCrypt cards the NFT API does not list.
 *
 * @param params - Indexer results.
 * @param params.nftItems - NFT API items, undefined when the call failed.
 * @param params.walletCards - CollectorCrypt cards, undefined when the call failed.
 * @returns The indexed cards, one per mint.
 */
export const toIndexedCards = ({
  nftItems,
  walletCards,
}: {
  nftItems: SolanaNftItem[] | undefined;
  walletCards: CcWalletCard[] | undefined;
}): CollectorCryptCard[] | undefined => {
  if (!nftItems && !walletCards) {
    return undefined;
  }
  const walletByMint = new Map(
    (walletCards ?? []).map((walletCard) => [
      walletCard.nftAddress,
      walletCard,
    ]),
  );
  const nftApiMints = new Set(
    (nftItems ?? []).map((item) => item.token_address),
  );
  const fromNftApi = (nftItems ?? [])
    .filter(
      (item) =>
        isHeld(item) &&
        (isCollectorCryptItemRef(item) || walletByMint.has(item.token_address)),
    )
    .map((item) => {
      const card = cardFromNftItem(item);
      const walletCard = walletByMint.get(card.mint);
      return walletCard ? enrichWithWalletCard(card, walletCard) : card;
    });
  const walletOnly = (walletCards ?? [])
    .filter((walletCard) => !nftApiMints.has(walletCard.nftAddress))
    .map(cardFromWalletCard);
  return [...fromNftApi, ...walletOnly];
};

/**
 * Highest available insured value or active asking price; not a market estimate.
 *
 * @param card - Card values supplied by CollectorCrypt.
 * @returns The display value, or undefined when neither value is known.
 */
export const getCardValue = ({
  insuredValue,
  listedPriceUsd,
}: Pick<CollectorCryptCard, 'insuredValue' | 'listedPriceUsd'>):
  | number
  | undefined => {
  if (insuredValue === undefined) {
    return listedPriceUsd;
  }
  return Math.max(insuredValue, listedPriceUsd ?? 0);
};

/**
 * Buyback cache entry from a `buyback/available` response.
 *
 * @param availability - API response.
 * @param now - Epoch ms.
 * @returns The cached buyback.
 */
export const buybackFromAvailability = (
  availability: BuybackAvailability,
  now: number,
): CollectorCryptBuyback =>
  availability.available
    ? { status: 'available', amount: availability.amount, checkedAt: now }
    : { status: 'unavailable', checkedAt: now };

/**
 * Stores a freshly awarded card over an existing entry for the same mint.
 * A sold (tombstoned) mint won again is replaced; otherwise the existing
 * metadata is kept, images refreshed and the pack bookkeeping updated.
 *
 * @param existing - Card already in state, if any.
 * @param awarded - Card from `openPack`.
 * @returns The card to store.
 */
export const mergeAwardedCard = (
  existing: CollectorCryptCard | undefined,
  awarded: CollectorCryptCard,
): CollectorCryptCard => {
  if (!existing || existing.sale?.status === 'completed') {
    return awarded;
  }
  return compact({
    ...existing,
    image: awarded.image ?? existing.image,
    mediumImage: awarded.mediumImage ?? existing.mediumImage,
    backImage: awarded.backImage ?? existing.backImage,
    mediumBackImage: awarded.mediumBackImage ?? existing.mediumBackImage,
    gradingId: existing.gradingId ?? awarded.gradingId,
    memo: awarded.memo,
    packCode: awarded.packCode,
    rarity: awarded.rarity ?? existing.rarity,
    buyback:
      awarded.buyback.status === 'unknown' ? existing.buyback : awarded.buyback,
  });
};

/**
 * Indexed metadata on top of the local bookkeeping of the same mint.
 *
 * @param local - Card in state.
 * @param indexed - Card from the indexers.
 * @param hasListings - Whether CollectorCrypt listings were loaded; otherwise
 * the local listing price is kept.
 * @returns The merged card.
 */
const mergeIndexedCard = (
  local: CollectorCryptCard,
  indexed: CollectorCryptCard,
  hasListings: boolean,
): CollectorCryptCard =>
  compact({
    ...local,
    ...indexed,
    name: indexed.name !== indexed.mint ? indexed.name : local.name,
    image: indexed.image ?? local.image,
    mediumImage: indexed.mediumImage ?? local.mediumImage,
    backImage: indexed.backImage ?? local.backImage,
    mediumBackImage: indexed.mediumBackImage ?? local.mediumBackImage,
    gradingId: indexed.gradingId ?? local.gradingId,
    listedPriceUsd: hasListings ? indexed.listedPriceUsd : local.listedPriceUsd,
    memo: local.memo ?? indexed.memo,
    packCode: local.packCode ?? indexed.packCode,
    rarity: local.rarity ?? indexed.rarity,
    acquiredAt: local.acquiredAt,
    buyback: local.buyback,
    sale: local.sale,
  });

/**
 * Whether a completed sale tombstone is past its lifetime.
 *
 * @param card - Card with a completed sale.
 * @param now - Epoch ms.
 * @returns True when it can be dropped.
 */
const isTombstoneExpired = (card: CollectorCryptCard, now: number): boolean =>
  now - (card.sale?.updatedAt ?? 0) > COLLECTOR_CRYPT_TIMINGS.TERMINAL_TTL;

/**
 * Whether a card missing from the indexers must still be kept.
 *
 * @param card - Local card.
 * @param now - Epoch ms.
 * @returns True for a pending sale or a freshly opened card.
 */
const isKeptWhileUnindexed = (card: CollectorCryptCard, now: number): boolean =>
  card.sale?.status === 'pending' ||
  (card.sale === undefined &&
    card.source === 'openPack' &&
    now - card.acquiredAt < COLLECTOR_CRYPT_TIMINGS.INDEXER_GRACE);

/**
 * Indexed card on top of the local card of the same mint. A sold tombstone
 * stays until the mint is acquired again or TERMINAL_TTL passes.
 *
 * @param local - Card in state.
 * @param indexed - Card from the indexers.
 * @param now - Epoch ms.
 * @param hasListings - Whether CollectorCrypt listings were loaded.
 * @returns The merged card, `local` itself when nothing changed.
 */
const mergeWithLocal = (
  local: CollectorCryptCard,
  indexed: CollectorCryptCard,
  now: number,
  hasListings: boolean,
): CollectorCryptCard => {
  if (local.sale?.status === 'completed') {
    return indexed.acquiredAt > local.sale.updatedAt ||
      isTombstoneExpired(local, now)
      ? { ...indexed, acquiredAt: indexed.acquiredAt || now }
      : local;
  }
  const merged = mergeIndexedCard(local, indexed, hasListings);
  return isEqual(merged, local) ? local : merged;
};

/**
 * Whether two records hold the same card objects for the same mints.
 *
 * @param a - First record.
 * @param b - Second record.
 * @returns True when every entry is reference-equal.
 */
const hasSameCards = (
  a: Record<string, CollectorCryptCard>,
  b: Record<string, CollectorCryptCard>,
): boolean => {
  const mints = Object.keys(b);
  return (
    Object.keys(a).length === mints.length &&
    mints.every((mint) => a[mint] === b[mint])
  );
};

/**
 * Reconciliation by mint. `indexed` undefined means indexers failed: keep local as is.
 * Indexed card: indexed metadata + local memo/packCode/rarity/buyback/sale/acquiredAt (fallback to local name/image).
 * Local-only card: removed only when `isComplete` (the NFT API answered), unless it has a pending sale,
 * was opened less than INDEXER_GRACE ago, or is in `keptMints` (opened, not revealed yet).
 * Completed sale tombstone: kept until the mint disappears, is acquired again, or TERMINAL_TTL passes.
 * Unchanged cards, and the record itself when nothing changed, keep their references.
 *
 * @param params - Merge inputs.
 * @param params.local - Cards in state for the account, by mint.
 * @param params.indexed - Cards from the indexers, undefined when they failed.
 * @param params.now - Epoch ms.
 * @param params.isComplete - Whether `indexed` lists every owned card (NFT API answered).
 * @param params.hasListings - Whether CollectorCrypt listing prices were loaded.
 * @param params.keptMints - Mints to keep even when unindexed.
 * @returns The reconciled cards, by mint.
 */
export const mergeCards = ({
  local,
  indexed,
  now,
  isComplete = true,
  hasListings = true,
  keptMints = new Set<string>(),
}: {
  local: Record<string, CollectorCryptCard>;
  indexed: CollectorCryptCard[] | undefined;
  now: number;
  isComplete?: boolean;
  hasListings?: boolean;
  keptMints?: ReadonlySet<string>;
}): Record<string, CollectorCryptCard> => {
  if (!indexed) {
    return local;
  }
  const merged: Record<string, CollectorCryptCard> = {};
  indexed.forEach((card) => {
    const localCard = local[card.mint];
    merged[card.mint] = localCard
      ? mergeWithLocal(localCard, card, now, hasListings)
      : { ...card, acquiredAt: card.acquiredAt || now };
  });
  Object.values(local).forEach((card) => {
    if (
      !merged[card.mint] &&
      (!isComplete ||
        keptMints.has(card.mint) ||
        isKeptWhileUnindexed(card, now))
    ) {
      merged[card.mint] = card;
    }
  });
  return hasSameCards(local, merged) ? local : merged;
};

/**
 * Whether the card may still be within CollectorCrypt's buyback window. The
 * first-seen time is never earlier than the award, so this never excludes an
 * eligible card.
 *
 * @param card - Card.
 * @param now - Epoch ms.
 * @returns False once the card was acquired more than BUYBACK_WINDOW ago.
 */
const isInBuybackWindow = (card: CollectorCryptCard, now: number): boolean =>
  card.acquiredAt <= 0 ||
  now - card.acquiredAt < COLLECTOR_CRYPT_TIMINGS.BUYBACK_WINDOW;

/**
 * Whether a card sync should check the buyback offer again. A cached offer is
 * re-checked after its TTL so it can expire; unknown and unavailable cards
 * are only checked while they may still be sold.
 *
 * @param card - Card.
 * @param now - Epoch ms.
 * @returns True when the cached offer is stale. False during a sale.
 */
export const isBuybackStale = (
  card: CollectorCryptCard,
  now: number,
): boolean => {
  const { status, checkedAt } = card.buyback;
  if (card.sale) {
    return false;
  }
  if (status === 'available') {
    return (
      checkedAt === undefined ||
      now - checkedAt > COLLECTOR_CRYPT_TIMINGS.BUYBACK_AVAILABLE_TTL
    );
  }
  if (!isInBuybackWindow(card, now)) {
    return false;
  }
  return (
    status === 'unknown' ||
    checkedAt === undefined ||
    now - checkedAt > COLLECTOR_CRYPT_TIMINGS.BUYBACK_UNAVAILABLE_TTL
  );
};

/**
 * Whether a buyback amount is below what the user confirmed, or either one is
 * zero or malformed.
 *
 * @param amount - Offered refund, base units.
 * @param expectedAmount - Refund the user confirmed, base units.
 * @returns True when the sale must not proceed at this amount.
 */
export const isBuybackBelow = (
  amount: string | undefined,
  expectedAmount: string,
): boolean => {
  const offered = parseBaseUnits(amount);
  const expected = parseBaseUnits(expectedAmount);
  return offered === 0n || expected === 0n || offered < expected;
};

/**
 * Whether the indexers' cached snapshot may predate a local change: a card
 * opened or sold less than INDEXER_GRACE ago.
 *
 * @param cards - Cards of the account, by mint.
 * @param now - Epoch ms.
 * @returns True when a sync should bypass the NFT API cache.
 */
export const shouldBypassIndexerCache = (
  cards: Record<string, CollectorCryptCard> | undefined,
  now: number,
): boolean =>
  Object.values(cards ?? {}).some(
    (card) =>
      (card.source === 'openPack' &&
        now - card.acquiredAt < COLLECTOR_CRYPT_TIMINGS.INDEXER_GRACE) ||
      (card.sale?.status === 'completed' &&
        now - card.sale.updatedAt < COLLECTOR_CRYPT_TIMINGS.INDEXER_GRACE),
  );

/**
 * Cards to display. Excludes completed sales, sorted by acquiredAt desc.
 *
 * @param cards - Cards of the account, by mint.
 * @returns The visible cards.
 */
export const getVisibleCards = (
  cards: Record<string, CollectorCryptCard> | undefined,
): CollectorCryptCard[] =>
  Object.values(cards ?? {})
    .filter((card) => card.sale?.status !== 'completed')
    .sort(
      (a, b) => b.acquiredAt - a.acquiredAt || a.mint.localeCompare(b.mint),
    );
