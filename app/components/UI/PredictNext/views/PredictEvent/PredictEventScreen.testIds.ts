export const PredictEventScreenTestIds = {
  VIEW: 'predict-next-event',
  BACK: 'predict-next-event-back',
  TITLE: 'predict-next-event-title',
  SUBTITLE: 'predict-next-event-subtitle',
  LOADING: 'predict-next-event-loading',
  ERROR: 'predict-next-event-error',
  ERROR_MESSAGE: 'predict-next-event-error-message',
  RETRY: 'predict-next-event-retry',
  STANDARD_HEADER: 'predict-next-event-standard-header',
  IMAGE: 'predict-next-event-image',
  GAME_HEADER: 'predict-next-event-game-header',
  GAME_STATUS: 'predict-next-event-game-status',
  GAME_METADATA: 'predict-next-event-game-metadata',
  MARKETS: 'predict-next-event-markets',
  market: (marketId: string) => `predict-next-event-market-${marketId}`,
  team: (selection: 'away' | 'home') => `predict-next-event-team-${selection}`,
  teamLogo: (selection: 'away' | 'home') =>
    `predict-next-event-team-${selection}-logo`,
  teamLogoFallback: (selection: 'away' | 'home') =>
    `predict-next-event-team-${selection}-logo-fallback`,
  teamName: (selection: 'away' | 'home') =>
    `predict-next-event-team-${selection}-name`,
  teamScore: (selection: 'away' | 'home') =>
    `predict-next-event-team-${selection}-score`,
} as const;
