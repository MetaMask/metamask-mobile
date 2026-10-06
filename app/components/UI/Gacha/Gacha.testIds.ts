/** Test IDs of the Gacha module. */

export const GachaHomeTestIds = {
  CONTAINER: 'gacha-home',
  BACK_BUTTON: 'gacha-home-back',
  BALANCE: 'gacha-home-balance',
  FUND_BUTTON: 'gacha-home-fund',
  FUNDING_STATUS: 'gacha-home-funding-status',
  FUNDING_ERROR: 'gacha-home-funding-error',
  NO_ACCOUNT: 'gacha-home-no-account',
  TABS: 'gacha-home-tabs',
  PACKS_TAB: 'gacha-home-tab-packs',
  CARDS_TAB: 'gacha-home-tab-cards',
  DEV_TAB: 'gacha-home-tab-dev',
} as const;

export const GachaDevTestIds = {
  CONTAINER: 'gacha-dev',
  RESET_ONBOARDING: 'gacha-dev-reset-onboarding',
} as const;

export const GachaAttentionBannerTestIds = {
  BANNER: 'gacha-attention-banner',
} as const;

export const GachaPacksTestIds = {
  LIST: 'gacha-packs-list',
  SKELETON: 'gacha-packs-skeleton',
  ERROR: 'gacha-packs-error',
  EMPTY: 'gacha-packs-empty',
  FILTERS: 'gacha-packs-filters',
  COLLECTION_FILTER: (collection: string) => `gacha-packs-filter-${collection}`,
} as const;

export const GachaPackCardTestIds = {
  CARD: (code: string) => `gacha-pack-${code}`,
  IMAGE: (code: string) => `gacha-pack-${code}-image`,
  OPEN_BUTTON: (code: string) => `gacha-pack-${code}-open`,
} as const;

export const GachaPurchaseSheetTestIds = {
  SHEET: 'gacha-purchase-sheet',
  CONTENT: 'gacha-purchase-sheet-content',
  ODDS: 'gacha-purchase-sheet-odds',
  IMAGE: 'gacha-purchase-sheet-image',
  CLOSE_BUTTON: 'gacha-purchase-sheet-close',
  CONFIRM_BUTTON: 'gacha-purchase-sheet-confirm',
  ERROR: 'gacha-purchase-sheet-error',
} as const;

export const GachaCardsTestIds = {
  LIST: 'gacha-cards-list',
  SKELETON: 'gacha-cards-skeleton',
  EMPTY: 'gacha-cards-empty',
  EMPTY_CTA: 'gacha-cards-empty-cta',
  SYNC_ERROR: 'gacha-cards-sync-error',
  SYNC_RETRY: 'gacha-cards-sync-retry',
  TOTAL_VALUE: 'gacha-cards-total-value',
  FILTERS: 'gacha-cards-filters',
  ALL_FILTER: 'gacha-cards-filter-all',
  SELL_AVAILABLE_FILTER: 'gacha-cards-filter-sell-available',
  NO_SELL_AVAILABLE: 'gacha-cards-no-sell-available',
} as const;

export const GachaCardTileTestIds = {
  TILE: (mint: string) => `gacha-card-tile-${mint}`,
  NAME: (mint: string) => `gacha-card-tile-${mint}-name`,
  VALUE: (mint: string) => `gacha-card-tile-${mint}-value`,
  REFLECTION: (mint: string) => `gacha-card-tile-${mint}-reflection`,
  SELLING_TAG: (mint: string) => `gacha-card-tile-${mint}-selling`,
} as const;

export const GachaCardImageTestIds = {
  IMAGE: 'gacha-card-image',
  SKELETON: 'gacha-card-image-skeleton',
  FALLBACK: 'gacha-card-image-fallback',
} as const;

export const GachaCardDisplayTestIds = {
  CONTAINER: 'gacha-card-display',
  NAME: 'gacha-card-display-name',
  GRADE: 'gacha-card-display-grade',
  RARITY: 'gacha-card-display-rarity',
  VALUE: 'gacha-card-display-value',
  DETAILS: 'gacha-card-display-details',
  GRADING: 'gacha-card-display-grading',
  METADATA: 'gacha-card-display-metadata',
  OWNER: 'gacha-card-display-owner',
  YEAR: 'gacha-card-display-year',
  GRADING_COMPANY: 'gacha-card-display-grading-company',
  GRADING_ID: 'gacha-card-display-grading-id',
  COLLECTION: 'gacha-card-display-collection',
  SET: 'gacha-card-display-set',
} as const;

export const GachaInteractiveCardTestIds = {
  PAN_GESTURE: 'gacha-interactive-card-pan',
  CONTAINER: 'gacha-interactive-card',
  FRONT: 'gacha-interactive-card-front',
  BACK: 'gacha-interactive-card-back',
  EDGE: 'gacha-interactive-card-edge',
} as const;

export const GachaBuybackOfferTestIds = {
  CHECKING: 'gacha-buyback-checking',
  AVAILABLE: 'gacha-buyback-available',
  UNAVAILABLE: 'gacha-buyback-unavailable',
  ERROR: 'gacha-buyback-error',
  RETRY: 'gacha-buyback-retry',
  PENDING: 'gacha-buyback-pending',
} as const;

export const GachaErrorPanelTestIds = {
  RETRY: 'gacha-error-panel-retry',
} as const;

export const GachaRevealTestIds = {
  CONTAINER: 'gacha-reveal',
  CLOSE_BUTTON: 'gacha-reveal-close',
  PROCESSING: 'gacha-reveal-processing',
  STAGE: 'gacha-reveal-stage',
  ERROR: 'gacha-reveal-error',
  ERROR_MESSAGE: 'gacha-reveal-error-message',
  RETRY_BUTTON: 'gacha-reveal-retry',
  START_OVER_BUTTON: 'gacha-reveal-start-over',
  FUNDING_ERROR: 'gacha-reveal-funding-error',
  ERROR_CLOSE_BUTTON: 'gacha-reveal-error-close',
  REVEALED: 'gacha-reveal-revealed',
  SELL_AND_OPEN_BUTTON: 'gacha-reveal-sell-and-open',
  BUY_AGAIN_BUTTON: 'gacha-reveal-buy-again',
  DEMO_RARITY: (rarity: string) => `gacha-reveal-demo-${rarity}`,
  DEMO_REPLAY_BUTTON: 'gacha-reveal-demo-replay',
  DEMO_SELL_AND_OPEN_BUTTON: 'gacha-reveal-demo-sell-and-open',
} as const;

export const GachaCardViewTestIds = {
  CONTAINER: 'gacha-card-view',
  BACK_BUTTON: 'gacha-card-view-back',
  NOT_FOUND: 'gacha-card-view-not-found',
  SELL_BUTTON: 'gacha-card-view-sell',
  VIEW_ON_CC_BUTTON: 'gacha-card-view-open-cc',
} as const;
