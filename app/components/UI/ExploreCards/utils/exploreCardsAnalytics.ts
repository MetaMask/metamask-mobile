import { trackExploreInteracted } from '../../../Views/TrendingView/search/analytics';
import type { DeckCardType } from '../types';

/** Banner tap on the Now tab. */
export const trackExploreCardsBannerTapped = (): void => {
  trackExploreInteracted({
    interaction_type: 'section_item_tapped',
    tab_name: 'Now',
    section_name: 'explore_cards',
  });
};

/** CTA tap on a deck card (swap/long/short/yes/no/follow/read). */
export const trackExploreCardsCta = (
  itemType: DeckCardType,
  cta: string,
  itemClicked?: string,
): void => {
  trackExploreInteracted({
    interaction_type: 'section_item_tapped',
    tab_name: 'Now',
    section_name: 'explore_cards',
    item_type: itemType,
    cta,
    item_clicked: itemClicked,
  });
};

/** The user swiped through the whole deck. */
export const trackExploreCardsDeckCompleted = (): void => {
  trackExploreInteracted({
    interaction_type: 'section_item_tapped',
    tab_name: 'Now',
    section_name: 'explore_cards',
    cta: 'deck_completed',
  });
};

/** The user dealt themselves a fresh deck from the empty state. */
export const trackExploreCardsDeckRestarted = (): void => {
  trackExploreInteracted({
    interaction_type: 'section_item_tapped',
    tab_name: 'Now',
    section_name: 'explore_cards',
    cta: 'deck_restarted',
  });
};
