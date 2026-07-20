/**
 * Query key factory for Predict game state.
 *
 * The detail key is used as the shared UI cache for live sports scoreboard data.
 */
export const predictGameKeys = {
  all: () => ['predict', 'game'] as const,
  detail: (gameId: string) => [...predictGameKeys.all(), gameId] as const,
};
