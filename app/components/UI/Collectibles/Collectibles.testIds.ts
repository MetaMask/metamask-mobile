/** Test IDs of the Collectibles module. */

export const CollectiblesCarouselTestIds = {
  WHEEL: 'collectibles-pack-wheel',
  PAN: 'collectibles-pack-wheel-pan',
  CONTAINER: 'collectibles-popular-carousel',
  GALAXY: 'collectibles-pack-galaxy',
  BUY: 'collectibles-popular-buy',
  PACK: (code: string) => `collectibles-hero-pack-${code}`,
} as const;

export const CollectiblesPackSocialTestIds = {
  SUMMARY: 'collectibles-pack-social-summary',
  PEOPLE: 'collectibles-pack-social-people',
  EPIC: 'collectibles-pack-social-epic',
  PEOPLE_LOADING: 'collectibles-pack-social-people-loading',
  EPIC_LOADING: 'collectibles-pack-social-epic-loading',
} as const;

export const CollectiblesHomeTestIds = {
  CONTAINER: 'collectibles-home',
  BACK_BUTTON: 'collectibles-home-back',
  BALANCE: 'collectibles-home-balance',
  FUND_BUTTON: 'collectibles-home-fund',
  NO_ACCOUNT: 'collectibles-home-no-account',
  TABS: 'collectibles-home-tabs',
  HOME_TAB: 'collectibles-home-tab-home',
  OVERVIEW: 'collectibles-home-overview',
  CATEGORY: (category: string) => `collectibles-home-category-${category}`,
  PACKS_TAB: 'collectibles-home-tab-packs',
  CARDS_TAB: 'collectibles-home-tab-cards',
  DEV_TAB: 'collectibles-home-tab-dev',
  MARKET_TAB: 'collectibles-home-tab-market',
  MARKET: 'collectibles-market',
  MARKET_OPEN_PARTNER: 'collectibles-market-open-partner',
} as const;

export const CollectiblesDevTestIds = {
  CONTAINER: 'collectibles-dev',
  RESET_ONBOARDING: 'collectibles-dev-reset-onboarding',
  FAUCET: 'collectibles-dev-faucet',
  COPY_ADDRESS: 'collectibles-dev-copy-address',
  ADDRESS: 'collectibles-dev-address',
} as const;

export const CollectiblesAttentionBannerTestIds = {
  BANNER: 'collectibles-attention-banner',
} as const;

export const CollectiblesPacksTestIds = {
  LIST: 'collectibles-packs-list',
  SKELETON: 'collectibles-packs-skeleton',
  ERROR: 'collectibles-packs-error',
  EMPTY: 'collectibles-packs-empty',
  FILTERS: 'collectibles-packs-filters',
  COLLECTION_FILTER: (collection: string) =>
    `collectibles-packs-filter-${collection}`,
} as const;

export const CollectiblesPackCardTestIds = {
  CARD: (code: string) => `collectibles-pack-${code}`,
  IMAGE: (code: string) => `collectibles-pack-${code}-image`,
  OPEN_BUTTON: (code: string) => `collectibles-pack-${code}-open`,
} as const;

export const CollectiblesPurchaseSheetTestIds = {
  SHEET: 'collectibles-purchase-sheet',
  CONTENT: 'collectibles-purchase-sheet-content',
  ODDS: 'collectibles-purchase-sheet-odds',
  IMAGE: 'collectibles-purchase-sheet-image',
  CLOSE_BUTTON: 'collectibles-purchase-sheet-close',
  CONFIRM_BUTTON: 'collectibles-purchase-sheet-confirm',
  ERROR: 'collectibles-purchase-sheet-error',
} as const;

export const CollectiblesCardsTestIds = {
  LIST: 'collectibles-cards-list',
  SKELETON: 'collectibles-cards-skeleton',
  EMPTY: 'collectibles-cards-empty',
  EMPTY_CTA: 'collectibles-cards-empty-cta',
  SYNC_ERROR: 'collectibles-cards-sync-error',
  SYNC_RETRY: 'collectibles-cards-sync-retry',
  TOTAL_VALUE: 'collectibles-cards-total-value',
  SEARCH_ENTRY: 'collectibles-cards-search-entry',
  SEARCH_INPUT: 'collectibles-cards-search',
  SORT: 'collectibles-cards-sort',
  FILTERS: 'collectibles-cards-filters',
  ALL_FILTER: 'collectibles-cards-filter-all',
  COLLECTION_FILTER: (category: string) =>
    `collectibles-cards-category-${category}`,
  CLEAR_FILTERS: 'collectibles-cards-clear-filters',
  SELL_AVAILABLE_FILTER: 'collectibles-cards-filter-sell-available',
  NO_SELL_AVAILABLE: 'collectibles-cards-no-sell-available',
} as const;

export const CollectiblesCardTileTestIds = {
  ARTWORK: (mint: string) => `collectibles-card-tile-${mint}-artwork`,
  TILE: (mint: string) => `collectibles-card-tile-${mint}`,
  NAME: (mint: string) => `collectibles-card-tile-${mint}-name`,
  VALUE: (mint: string) => `collectibles-card-tile-${mint}-value`,
  REFLECTION: (mint: string) => `collectibles-card-tile-${mint}-reflection`,
  SELLING_TAG: (mint: string) => `collectibles-card-tile-${mint}-selling`,
} as const;

export const CollectiblesCardImageTestIds = {
  IMAGE: 'collectibles-card-image',
  SKELETON: 'collectibles-card-image-skeleton',
  FALLBACK: 'collectibles-card-image-fallback',
} as const;

export const CollectiblesCardDisplayTestIds = {
  CONTAINER: 'collectibles-card-display',
  NAME: 'collectibles-card-display-name',
  GRADE: 'collectibles-card-display-grade',
  RARITY: 'collectibles-card-display-rarity',
  VALUE: 'collectibles-card-display-value',
  DETAILS: 'collectibles-card-display-details',
  GRADING: 'collectibles-card-display-grading',
  METADATA: 'collectibles-card-display-metadata',
  SECTION_TOGGLE: (section: string) => `${section}-toggle`,
  CONTRACT: 'collectibles-card-contract',
  TOKEN_ID: 'collectibles-card-token-id',
  BLOCKCHAIN: 'collectibles-card-blockchain',
  COPY_TOKEN_ID: 'collectibles-card-copy-token-id',
  OWNER: 'collectibles-card-display-owner',
  YEAR: 'collectibles-card-display-year',
  GRADING_COMPANY: 'collectibles-card-display-grading-company',
  GRADING_ID: 'collectibles-card-display-grading-id',
  COLLECTION: 'collectibles-card-display-collection',
  SET: 'collectibles-card-display-set',
} as const;

export const CollectiblesInteractiveCardTestIds = {
  PAN_GESTURE: 'collectibles-interactive-card-pan',
  CONTAINER: 'collectibles-interactive-card',
  FRONT: 'collectibles-interactive-card-front',
  BACK: 'collectibles-interactive-card-back',
  EDGE: 'collectibles-interactive-card-edge',
} as const;

export const CollectiblesBuybackOfferTestIds = {
  CHECKING: 'collectibles-buyback-checking',
  AVAILABLE: 'collectibles-buyback-available',
  UNAVAILABLE: 'collectibles-buyback-unavailable',
  ERROR: 'collectibles-buyback-error',
  RETRY: 'collectibles-buyback-retry',
  PENDING: 'collectibles-buyback-pending',
} as const;

export const CollectiblesErrorPanelTestIds = {
  RETRY: 'collectibles-error-panel-retry',
} as const;

export const CollectiblesRevealTestIds = {
  CONTAINER: 'collectibles-reveal',
  CLOSE_BUTTON: 'collectibles-reveal-close',
  PROCESSING: 'collectibles-reveal-processing',
  STAGE: 'collectibles-reveal-stage',
  ERROR: 'collectibles-reveal-error',
  ERROR_MESSAGE: 'collectibles-reveal-error-message',
  RETRY_BUTTON: 'collectibles-reveal-retry',
  START_OVER_BUTTON: 'collectibles-reveal-start-over',
  ERROR_CLOSE_BUTTON: 'collectibles-reveal-error-close',
  REVEALED: 'collectibles-reveal-revealed',
  SELL_AND_OPEN_BUTTON: 'collectibles-reveal-sell-and-open',
  BUY_AGAIN_BUTTON: 'collectibles-reveal-buy-again',
} as const;

export const CollectiblesCardViewTestIds = {
  CONTAINER: 'collectibles-card-view',
  BACK_BUTTON: 'collectibles-card-view-back',
  INFO_BUTTON: 'collectibles-card-info-open',
  SHARE_BUTTON: 'collectibles-card-share',
  REPLAY_BUTTON: 'collectibles-card-replay',
  NOT_FOUND: 'collectibles-card-view-not-found',
  LOADING: 'collectibles-card-view-loading',
  READ_ERROR: 'collectibles-card-view-read-error',
  SELL_BUTTON: 'collectibles-card-view-sell',
} as const;

export const CollectiblesShareComposerTestIds = {
  CONTAINER: 'collectibles-share-composer',
  CAPTION: 'collectibles-share-caption',
  PUBLISH: 'collectibles-share-publish',
} as const;

export const CollectiblesPackDetailTestIds = {
  LOADING: 'collectibles-pack-detail-loading',
  FOOTER: 'collectibles-pack-footer',
  CONTAINER: 'collectibles-pack-detail',
  VIEW_ODDS: 'collectibles-pack-detail-view-odds',
  INFORMATION: 'collectibles-pack-detail-information',
  OPENING: (mint: string) => `collectibles-pack-detail-opening-${mint}`,
  BUY: 'collectibles-pack-detail-buy',
  INSIDE: 'collectibles-pack-detail-inside',
  RECENT: 'collectibles-pack-detail-recent',
} as const;
