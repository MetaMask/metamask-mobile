import { useSelector } from 'react-redux';

import type { RootState } from '../../../../reducers';
import type { FiatProviderScope } from '../../../../reducers/fiatOrders/types';

/**
 * Resolves the effective headless fiat provider-class scope.
 *
 * TEMP(device-testing): hard-forced to `in-app` on every build. The
 * HeadlessPlayground scope toggle is hidden on RC builds (the Ramp SDK treats RC
 * as production), so this lets the widened in-app flow be exercised on-device
 * without the toggle. This intentionally bypasses the production hard-off guard
 * and the stored `fiatOrders.providerScope` setting.
 *
 * REVERT before merge: restore the production hard-off guard (return `off` when
 * `getFeatureFlagAppEnvironment()` is `EnvironmentType.Production`) and otherwise
 * return `selectFiatProviderScopeSetting(state)`, re-adding the `EnvironmentType`,
 * `getFeatureFlagAppEnvironment`, and `selectFiatProviderScopeSetting` imports.
 *
 * Read by both the mobile availability gate (`useHasNativeFiatProvider`) and the
 * `RampsController` `getProviderScope` injection so the two never disagree.
 *
 * @param _state - The Redux root state (unused while forced).
 * @returns The effective provider scope.
 */
export function getEffectiveProviderScope(
  _state: RootState,
): FiatProviderScope {
  return 'in-app';
}

/**
 * Hook returning the effective headless fiat provider-class scope.
 *
 * @returns The effective provider scope.
 */
export function useFiatProviderScope(): FiatProviderScope {
  return useSelector(getEffectiveProviderScope);
}
