import type { PackHeroSource } from '../components/CollectiblesDiscovery/PackHeroFlight.geometry';
/** Destination selected for a Collectibles stack entry (legacy initialTab parameter). */
export type CollectiblesHomeTab = 'home' | 'packs' | 'cards' | 'market' | 'dev';
export type CollectiblesSearchScope = 'all' | 'packs' | 'cards';

/** A serializable intent, preserved through first-visit onboarding. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectiblesEntryDestination =
  | { kind: 'home'; tab: CollectiblesHomeTab }
  | { kind: 'pack'; packCode: string }
  | { kind: 'card'; mint: string }
  | { kind: 'purchase'; packCode: string };

export interface CollectiblesHomeParams {
  entry?: Extract<CollectiblesEntryDestination, { kind: 'purchase' }>;
  initialTab?: CollectiblesHomeTab;
  category?: string;
}

/** Local previews never carry a purchase memo. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectiblesRevealParams =
  | { memo: string; previewMint?: never; skipReveal?: boolean }
  | { previewMint: string; memo?: never };

export interface CollectiblesCardParams {
  /** Mint of the card to display. */
  mint: string;
}

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectiblesStackParamList = {
  CollectiblesSearch:
    | { scope?: CollectiblesSearchScope; query?: string }
    | undefined;
  CollectiblesExplore: {
    screen:
      | 'history'
      | 'sales'
      | 'pokedex'
      | 'leaderboard'
      | 'feed'
      | 'profile'
      | 'greatest-hits';
    profileId?: string;
    cardId?: string;
  };
  CollectiblesOnboarding:
    | { destination?: CollectiblesEntryDestination }
    | undefined;
  CollectiblesHome: CollectiblesHomeParams | undefined;
  CollectiblesReveal: CollectiblesRevealParams;
  CollectiblesCard: CollectiblesCardParams;
  CollectiblesPack: { packCode: string; heroSource?: PackHeroSource };
};
