import type { RootState } from '../../../../reducers';

/** Returns wallet-wide onboarding completion, including states saved before onboarding existed. */
export const selectCollectiblesHasCompletedOnboarding = (
  state: RootState,
): boolean =>
  state.engine.backgroundState.CollectiblesController?.hasCompletedOnboarding ??
  false;
