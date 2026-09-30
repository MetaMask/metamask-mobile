import {
  COLLECTOR_CRYPT_COLLECTIONS,
  COLLECTOR_CRYPT_TIMINGS,
  COLLECTOR_CRYPT_UPDATE_AUTHORITY,
} from '../constants';
import type { SolanaNftItem } from '../../../services/solanaNftApi.schemas';
import type { CcNftWon, CcWalletCard } from '../schemas';
import type {
  BuybackAvailability,
  OpenPackResult,
} from '../services/collectorCryptApi';
import type {
  CollectorCryptBuyback,
  CollectorCryptCard,
  PackOperation,
} from '../types';
import { parseInsuredValue, parseTimestamp } from './format';

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

/** Whether an NFT API item is a CollectorCrypt card still held. */
export const isCollectorCryptItem = (item: SolanaNftItem): boolean => {
  const { onchain_collection_address: collection, creators } = item.nft_token;
  const held = typeof item.balance !== 'number' || item.balance > 0;
  const inCollection =
    Boolean(collection) &&
    COLLECTOR_CRYPT_COLLECTIONS.includes(collection ?? '');
  const byAuthority = (creators ?? []).some(
    (creator) => creator.address === COLLECTOR_CRYPT_UPDATE_AUTHORITY,
  );
  return held && (inCollection || byAuthority);
};

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
 * @returns The merged card.
 */
const mergeIndexedCard = (
  local: CollectorCryptCard,
  indexed: CollectorCryptCard,
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
    listedPriceUsd: indexed.listedPriceUsd,
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
 * Reconciliation by mint. `indexed` undefined means indexers failed: keep local as is.
 * Indexed card: indexed metadata + local memo/packCode/rarity/buyback/sale/acquiredAt (fallback to local name/image).
 * Local-only card: kept if source 'openPack' and younger than INDEXER_GRACE, or sale pending; dropped otherwise (no longer owned).
 * Completed sale tombstone: kept until the mint disappears, is acquired again, or TERMINAL_TTL passes.
 *
 * @param params - Merge inputs.
 * @param params.local - Cards in state for the account, by mint.
 * @param params.indexed - Cards from the indexers, undefined when they failed.
 * @param params.now - Epoch ms.
 * @returns The reconciled cards, by mint.
 */
export const mergeCards = ({
  local,
  indexed,
  now,
}: {
  local: Record<string, CollectorCryptCard>;
  indexed: CollectorCryptCard[] | undefined;
  now: number;
}): Record<string, CollectorCryptCard> => {
  if (!indexed) {
    return local;
  }
  const merged: Record<string, CollectorCryptCard> = {};
  indexed.forEach((card) => {
    const localCard = local[card.mint];
    if (!localCard) {
      merged[card.mint] = { ...card, acquiredAt: card.acquiredAt || now };
    } else if (localCard.sale?.status !== 'completed') {
      merged[card.mint] = mergeIndexedCard(localCard, card);
    } else {
      merged[card.mint] =
        card.acquiredAt > localCard.sale.updatedAt ||
        isTombstoneExpired(localCard, now)
          ? { ...card, acquiredAt: card.acquiredAt || now }
          : localCard;
    }
  });
  Object.values(local).forEach((card) => {
    if (!merged[card.mint] && isKeptWhileUnindexed(card, now)) {
      merged[card.mint] = card;
    }
  });
  return merged;
};

/**
 * Whether the cached buyback offer should be checked again.
 *
 * @param card - Card.
 * @param now - Epoch ms.
 * @returns True when unknown or older than its TTL. False during a sale.
 */
export const isBuybackStale = (
  card: CollectorCryptCard,
  now: number,
): boolean => {
  const { status, checkedAt } = card.buyback;
  if (card.sale) {
    return false;
  }
  if (status === 'unknown' || checkedAt === undefined) {
    return true;
  }
  const ttl =
    status === 'available'
      ? COLLECTOR_CRYPT_TIMINGS.BUYBACK_AVAILABLE_TTL
      : COLLECTOR_CRYPT_TIMINGS.BUYBACK_UNAVAILABLE_TTL;
  return now - checkedAt > ttl;
};

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
