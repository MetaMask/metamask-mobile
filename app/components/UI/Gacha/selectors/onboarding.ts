import type { RootState } from '../../../../reducers';

/** Returns wallet-wide onboarding completion, including states saved before onboarding existed. */
export const selectGachaHasCompletedOnboarding = (state: RootState): boolean =>
  state.engine.backgroundState.GachaController?.hasCompletedOnboarding ?? false;
