import type { PackPartnerCard } from './packPartner';

/** Public inventory metadata: never an owned card or an actionable buyback. */
export type PackPartnerInventoryCard = Pick<
  PackPartnerCard,
  | 'mint'
  | 'name'
  | 'set'
  | 'image'
  | 'mediumImage'
  | 'backImage'
  | 'mediumBackImage'
  | 'rarity'
  | 'insuredValue'
  | 'grade'
  | 'gradingCompany'
  | 'gradingId'
  | 'year'
  | 'category'
  | 'listedPriceUsd'
> & {
  /** Pack whose inventory or opening supplied this snapshot, not historical NFT provenance. */
  sourcePackCode?: string;
};

export interface PackPartnerInventoryPage {
  cards: PackPartnerInventoryCard[];
  nextCursor?: string;
}
