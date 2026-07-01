import {
  getDefaultRampsControllerState,
  type RampsControllerState,
} from '@metamask/ramps-controller';

/**
 * Prepare persisted RampsController state for startup.
 *
 * Until mobile picks up MetaMask/core#9261, discard any persisted countries
 * catalog so init() refetches fresh preset amounts instead of reusing stale
 * values across app restarts.
 */
export function prepareRampsControllerStartupState(
  persistedState: RampsControllerState | undefined,
): RampsControllerState {
  const state = persistedState ?? getDefaultRampsControllerState();

  return {
    ...state,
    countries: getDefaultRampsControllerState().countries,
  };
}
