import { useSelector } from 'react-redux';
import { PerpsMode } from '@metamask/perps-controller';
import { selectPerpsProModeEnabledFlag } from '../../selectors/featureFlags';
import { selectPerpsMode } from '../../selectors/perpsController';

/**
 * Whether the Perps Pro-mode market layout should render for the current user.
 *
 * Returns true only when the remote Pro-mode feature flag is enabled and the
 * persisted controller mode is `PerpsMode.Pro`. Otherwise the lite
 * `PerpsMarketDetailsView` is used.
 *
 * @returns Whether the Perps Pro-mode layout is enabled for the current user.
 */
export const usePerpsProModeEnabled = (): boolean => {
  const isFeatureEnabled = useSelector(selectPerpsProModeEnabledFlag);
  const mode = useSelector(selectPerpsMode);

  return isFeatureEnabled && mode === PerpsMode.Pro;
};
