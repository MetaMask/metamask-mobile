import { useSelector } from 'react-redux';
import { EnvironmentType } from '@metamask/remote-feature-flag-controller';

import type { RootState } from '../../../../reducers';
import { selectFiatProviderScopeSetting } from '../../../../reducers/fiatOrders';
import type { FiatProviderScope } from '../../../../reducers/fiatOrders/types';
import { getFeatureFlagAppEnvironment } from '../../../../core/Engine/controllers/remote-feature-flag-controller/utils';
import { selectMoneyHeadlessProviderScope } from '../../../../selectors/featureFlagController/moneyHeadlessProviderScope';

/**
 * Resolves the effective headless fiat provider-class scope.
 *
 * The activation switch is the remote `moneyHeadlessProviderScope` flag
 * (LaunchDarkly), resolved per environment and defaulting to `off` (native-only)
 * until it is explicitly flipped, so production stays hard-off by default.
 *
 * On non-production builds the local HeadlessPlayground toggle
 * (`selectFiatProviderScopeSetting`) acts as a developer override: when set to a
 * non-`off` scope it wins, letting engineers widen the flow locally without
 * touching LaunchDarkly. Production ignores the persisted toggle entirely and is
 * driven solely by the remote flag.
 *
 * Read by both the mobile availability gate (`useHasNativeFiatProvider`) and the
 * `RampsController` `getProviderScope` injection so the two never disagree.
 *
 * @param state - The Redux root state.
 * @returns The effective provider scope.
 */
export function getEffectiveProviderScope(state: RootState): FiatProviderScope {
  const remoteScope = selectMoneyHeadlessProviderScope(state);

  if (getFeatureFlagAppEnvironment() !== EnvironmentType.Production) {
    const devScope = selectFiatProviderScopeSetting(state);
    if (devScope !== 'off') {
      return devScope;
    }
  }

  return remoteScope;
}

/**
 * Hook returning the effective headless fiat provider-class scope (prod-guarded).
 *
 * @returns The effective provider scope.
 */
export function useFiatProviderScope(): FiatProviderScope {
  return useSelector(getEffectiveProviderScope);
}
