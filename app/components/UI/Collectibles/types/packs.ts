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
