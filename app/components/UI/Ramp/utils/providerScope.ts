import { useSelector } from 'react-redux';
import { EnvironmentType } from '@metamask/remote-feature-flag-controller';

import type { RootState } from '../../../../reducers';
import { selectFiatProviderScopeSetting } from '../../../../reducers/fiatOrders';
import type { FiatProviderScope } from '../../../../reducers/fiatOrders/types';
import { getFeatureFlagAppEnvironment } from '../../../../core/Engine/controllers/remote-feature-flag-controller/utils';

/**
 * Resolves the effective headless fiat provider-class scope, applying the
 * production hard-off guard: the dev/RC toggle is only honored on non-production
 * builds, so production always resolves to `off` (native-only) regardless of the
 * stored setting.
 *
 * Read by both the mobile availability gate (`useHasNativeFiatProvider`) and the
 * `RampsController` `getProviderScope` injection so the two never disagree.
 *
 * @param state - The Redux root state.
 * @returns The effective provider scope.
 */
export function getEffectiveProviderScope(state: RootState): FiatProviderScope {
  if (getFeatureFlagAppEnvironment() === EnvironmentType.Production) {
    return 'off';
  }
  return selectFiatProviderScopeSetting(state);
}

/**
 * Hook returning the effective headless fiat provider-class scope (prod-guarded).
 *
 * @returns The effective provider scope.
 */
export function useFiatProviderScope(): FiatProviderScope {
  return useSelector(getEffectiveProviderScope);
}
