import type {
  PackPartnerCard,
  PackPartnerRarity,
} from '../providers/pack-partner/types/packPartner';

/** One pack tile in the Home carousel. Placeholder shape until the APIs land. */
export interface HomePack {
  code: string;
  name: string;
  subtitle: string;
  // Packs opened over the past 7 days, across all users.
  openedCount: number;
  priceUsd: number;
}

export interface CatalogPack {
  code: string;
  name: string;
  openedCount: number;
  priceUsd?: number;
  isMachineOpen: boolean;
  imageUrl?: string;
}

export interface ListedPack extends CatalogPack {
  priceUsd: number;
  categoryId?: string;
}

export interface PackCategory {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface PackCategoryMapping {
  categories: PackCategory[];
  packCategories: Record<string, string>;
}

export interface EpicHuntMachine extends CatalogPack {
  isApproved: boolean;
  epicOdds?: number;
  pullsSinceEpic: number;
}

export interface RankedEpicHuntPack extends EpicHuntMachine {
  priceUsd: number;
  epicOdds: number;
  averagePulls: number;
  ratio: number;
}

export interface EpicHuntPack extends HomePack {
  pullsOverAverage: number;
}

export interface PackRarityOdds {
  rarity: PackPartnerRarity;
  oddsPercent: number;
  minValueUsd: number;
  maxValueUsd?: number;
}

export interface PackRarityCount {
  rarity: PackPartnerRarity;
  count: number;
}

export interface PackActivity {
  openerName: string;
  otherOpeners: number;
  pullerName: string;
  pulledRarity: PackPartnerRarity;
}

export interface PackDetail {
  code: string;
  name: string;
  category?: string;
  tier?: number;
  priceUsd?: number;
  imageUrl?: string;
  isAvailable: boolean;
  buybackRatePercent?: number;
  averageCardValueUsd?: number;
  topCardValueUsd?: number;
  odds: PackRarityOdds[];
  pulledSinceEpic: PackRarityCount[];
  activity: PackActivity;
}

export interface PackCardsPage {
  cards: PackPartnerCard[];
  nextPage?: number;
}
