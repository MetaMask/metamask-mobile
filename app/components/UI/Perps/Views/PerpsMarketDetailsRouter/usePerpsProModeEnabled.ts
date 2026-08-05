import { useIsPerpsProModeActive } from '../../utils/perpsModeSwitch';

/**
 * Whether the Perps Pro-mode market layout should render for the current user.
 *
 * Returns true only when the remote Pro-mode feature flag is enabled and the
 * persisted controller mode is `PerpsMode.Pro`. Otherwise the lite
 * `PerpsMarketDetailsView` is used.
 *
 * @returns Whether the Perps Pro-mode layout is enabled for the current user.
 */
export const usePerpsProModeEnabled = (): boolean => useIsPerpsProModeActive();
