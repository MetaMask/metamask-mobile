import { PACK_PARTNER_TIMINGS } from '../constants/packPartner';
import type {
  PpInventoryNft,
  PpNftWon,
  PpWalletCard,
} from '../schemas/packPartner';
import type { PackPartnerInventoryCard } from '../types/inventory';
import {
  toRarity,
  type BuybackAvailability,
  type OpenPackResult,
  type PackStatus,
} from '../../../services/clients/PackPartnerApiClient';
import type {
  PackPartnerBuyback,
  PackPartnerCard,
  PackPartnerNftStandard,
  PackPartnerPackOperation,
} from '../types/packPartner';
import { parseBaseUnits, parseInsuredValue, parseTimestamp } from './format';

type AwardedOpenPackResult = Extract<OpenPackResult, { status: 'awarded' }>;

/** Card fields that come from metadata (as opposed to local bookkeeping). */
type CardDetails = Partial<
  Pick<
    PackPartnerCard,
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
    | 'nftStandard'
    | 'category'
    | 'year'
    | 'set'
  >
>;

/** Reads an attribute value by trait name (case-insensitive). */
type AttributeReader = (traitType: string) => string | undefined;

const UNKNOWN_BUYBACK: PackPartnerBuyback = { status: 'unknown' };
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
 * Normalize the NFT standards supplied by Pack Partner.
 * This is display/state metadata, not proof of the transaction's NFT program.
 */
export const normalizeNftStandard = (
  value: string | null | undefined,
): PackPartnerNftStandard => {
  const standard = value?.replace(/[^a-z0-9]/giu, '').toLowerCase();
  switch (standard) {
    case 'core':
    case 'mplcoreasset':
    case 'metaplexcore':
      return 'core';
    case 'pnft':
    case 'programmablenft':
    case 'programmablenonfungible':
      return 'pnft';
    case 'nft':
    case 'nonfungible':
      return 'nft';
    case 'cnftcore':
      return 'cnft-core';
    default:
      // Ambiguous compressed labels do not identify a reviewed Bubblegum
      // format. Preserve unknown so the Snap rejects rather than guessing.
      return 'unknown';
  }
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
 * Card details supplied in `openPack` attributes.
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
 * @returns The image URLs supplied by PackPartner.
 */
const getNftWonImages = (
  nft: PpNftWon,
): Pick<
  PackPartnerCard,
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
 * @returns The offer, unknown when absent.
 */
const buybackFromAmount = (amount: string | undefined): PackPartnerBuyback =>
  amount && BASE_UNITS_PATTERN.test(amount) && BigInt(amount) > 0n
    ? { status: 'available', amount }
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
  operation: PackPartnerPackOperation,
  now: number,
): PackPartnerCard => {
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
    nftStandard: normalizeNftStandard(result.nft.nft_standard),
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
    ...(operation.batchId ? { batchId: operation.batchId } : {}),
    acquiredAt: now,
    buyback: result.automaticSale
      ? { status: 'unavailable' as const }
      : buybackFromAmount(result.buybackAmount),
    ...(result.automaticSale && result.buybackAmount
      ? {
          sale: {
            status: 'completed' as const,
            automatic: true,
            amount: result.buybackAmount,
            signature: result.transactionSignature,
            updatedAt: now,
          },
        }
      : {}),
  });
};

/** Maps a public pool item without granting ownership or a sell action. */
export const inventoryCardFromNft = (
  nft: PpInventoryNft,
): PackPartnerInventoryCard => {
  const { metadata } = nft.content;
  const read = createAttributeReader(
    (metadata.attributes ?? []).map(
      (attribute) => [attribute.trait_type, attribute.value] as const,
    ),
  );
  const images = getNftWonImages(nft);
  return compact({
    mint: nft.nft_address,
    name:
      toText(nft.description) ??
      toText(metadata.json_name) ??
      toText(nft.name) ??
      metadata.name,
    ...images,
    ...detailsFromAttributes(read),
    insuredValue:
      parseInsuredValue(nft.insured_value) ??
      parseInsuredValue(read('Insured Value')),
    rarity: toRarity(nft.rarity),
  });
};

/**
 * Card built from a delivered `pack/status` when `openPack` cannot return the
 * award. Owned cards read from PackPartner carry the full metadata.
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
  operation: PackPartnerPackOperation;
  now: number;
}): PackPartnerCard =>
  compact({
    mint,
    name: operation.packName,
    insuredValue: status.insuredValue,
    rarity: status.rarity,
    memo: operation.memo,
    packCode: operation.packCode,
    ...(operation.batchId ? { batchId: operation.batchId } : {}),
    acquiredAt: now,
    buyback: status.automaticSale
      ? { status: 'unavailable' as const }
      : UNKNOWN_BUYBACK,
    ...(status.automaticSale && status.buybackAmount
      ? {
          sale: {
            status: 'completed' as const,
            automatic: true,
            amount: status.buybackAmount,
            updatedAt: now,
          },
        }
      : {}),
  });

/**
 * Reads a full-size wallet photograph before any medium-size fallback.
 *
 * @param walletCard - Wallet card.
 * @param side - Side of the card.
 * @returns The original image URL, when provided.
 */
const getOriginalWalletImage = (
  walletCard: PpWalletCard,
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
}: PpWalletCard): number | undefined => {
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
 * Card details from the PackPartner cards API.
 *
 * @param walletCard - Wallet card.
 * @returns The details found.
 */
const detailsFromWalletCard = (walletCard: PpWalletCard): CardDetails =>
  compact({
    name: toText(walletCard.itemName),
    nftStandard: normalizeNftStandard(walletCard.nftStandard),
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
 * Card built from the authoritative PackPartner wallet cards API. Its
 * buyback offer is unknown until `buyback/available` is read.
 *
 * @param walletCard - Wallet card.
 * @returns The card; `acquiredAt` is zero when the transfer date is unknown.
 */
export const cardFromWalletCard = (
  walletCard: PpWalletCard,
): PackPartnerCard => {
  const details = detailsFromWalletCard(walletCard);
  return compact({
    ...details,
    mint: walletCard.nftAddress,
    name: details.name ?? walletCard.nftAddress,
    acquiredAt: parseTimestamp(walletCard.lastTransferredAt) ?? 0,
    buyback: UNKNOWN_BUYBACK,
  });
};

/**
 * Buyback offer from a `buyback/available` response.
 *
 * @param availability - API response.
 * @returns The offer.
 */
export const buybackFromAvailability = (
  availability: BuybackAvailability,
): PackPartnerBuyback =>
  availability.available
    ? { status: 'available', amount: availability.amount }
    : { status: 'unavailable' };

/**
 * Whether PackPartner may still buy the card back: it does so only within
 * 72 hours of the award. A card whose transfer date is unknown is checked.
 *
 * @param card - Card.
 * @param now - Epoch ms.
 * @returns False once the card was acquired more than BUYBACK_WINDOW ago.
 */
export const isInBuybackWindow = (
  card: Pick<PackPartnerCard, 'acquiredAt'>,
  now: number,
): boolean =>
  card.acquiredAt <= 0 ||
  now - card.acquiredAt < PACK_PARTNER_TIMINGS.BUYBACK_WINDOW;

/**
 * Whether a buyback amount is below what the user confirmed, or either one is
 * non-positive or malformed.
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
  return offered <= 0n || expected <= 0n || offered < expected;
};

/**
 * Owned cards, newest first.
 *
 * @param cards - Cards of the account.
 * @returns A sorted copy.
 */
export const sortOwnedCards = (
  cards: readonly PackPartnerCard[],
): PackPartnerCard[] =>
  [...cards].sort(
    (a, b) => b.acquiredAt - a.acquiredAt || a.mint.localeCompare(b.mint),
  );
