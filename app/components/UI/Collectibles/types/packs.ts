/** One pack tile in the Home carousel. Placeholder shape until the APIs land. */
export interface HomePack {
  code: string;
  name: string;
  subtitle: string;
  // Packs opened over the past 7 days, across all users.
  openedCount: number;
  // Missing when the pack has no price; those tiles are hidden.
  priceLabel?: string;
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
