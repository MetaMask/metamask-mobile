/** Offline price bands. Never import this authoring helper into the app. */
export interface PriceTier {
  id: string;
  label: string;
  upperBound: number | null;
  inclusive: boolean;
  ground: string;
}

export interface PricePalette {
  currency: 'USDC';
  defaultTier: string;
  tiers: PriceTier[];
}

/** Selects the first matching upper bound; null is the provider-neutral pack. */
export function selectPriceTier(
  price: number | null,
  palette: PricePalette,
): PriceTier {
  if (price !== null && (!Number.isFinite(price) || price < 0))
    throw new Error('A pack price must be a finite, non-negative USDC amount.');
  const tier = palette.tiers.find((candidate) =>
    price === null
      ? candidate.id === palette.defaultTier
      : candidate.upperBound === null ||
        (candidate.inclusive
          ? price <= candidate.upperBound
          : price < candidate.upperBound),
  );
  if (!tier) throw new Error(`No price palette configured for ${price}.`);
  return tier;
}
