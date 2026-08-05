import { useCallback } from 'react';
import { PerpsMode, type PerpsMarketData } from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsMode } from '../selectors/perpsController';
import { selectPerpsProModeEnabledFlag } from '../selectors/featureFlags';
import type { PerpsStackParamList } from '../types/navigation';

/**
 * Default market a user lands on when switching to Pro mode (TAT-3551, AC #4).
 */
export const PERPS_DEFAULT_PRO_MARKET_SYMBOL = 'BTC';

/**
 * Builds the minimal market payload used to navigate to the default Pro market.
 *
 * Only the symbol is known at the call site; the market detail view enriches
 * the remaining fields from the live markets stream, so a symbol-only payload
 * is sufficient to open `MARKET_DETAILS`.
 */
export const buildDefaultProMarket = (): PerpsMarketData =>
  ({
    symbol: PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  }) as unknown as PerpsMarketData;

/**
 * Whether the Perps Pro-mode experience is currently active for the user:
 * the remote Pro-mode feature flag is enabled AND the persisted controller
 * mode is `PerpsMode.Pro`. Takes plain state so it can be used outside React
 * (e.g. deeplink handlers), unlike the `useIsPerpsProModeActive` hook below.
 */
export const isPerpsProModeActive = (state: RootState): boolean =>
  selectPerpsProModeEnabledFlag(state) &&
  selectPerpsMode(state) === PerpsMode.Pro;

/**
 * React hook wrapper around {@link isPerpsProModeActive} for component call
 * sites that already have access to hooks.
 */
export const useIsPerpsProModeActive = (): boolean => {
  const isFeatureEnabled = useSelector(selectPerpsProModeEnabledFlag);
  const mode = useSelector(selectPerpsMode);

  return isFeatureEnabled && mode === PerpsMode.Pro;
};

/** Navigation target returned by {@link getPerpsHomeNavigationTarget}. */
export interface PerpsHomeNavigationTarget {
  screen: string;
  params: Record<string, unknown>;
}

/**
 * Resolves where a "go to Perps home" action should actually land, given
 * whether Pro mode is currently active.
 *
 * While Pro mode is active, `PerpsHomeView` must never be shown (TAT-3612):
 * every entry point instead lands on the default Pro market, so the user
 * only ever moves between a market page and the market list. Centralizing
 * this here keeps every entry point (Trade sheet, Wallet actions, Homepage
 * grid/pill, deeplinks, etc.) consistent.
 */
const resolvePerpsHomeNavigationTarget = (
  isProModeActive: boolean,
  extraParams: Record<string, unknown> = {},
): PerpsHomeNavigationTarget => {
  if (isProModeActive) {
    return {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: { market: buildDefaultProMarket(), ...extraParams },
    };
  }

  return {
    screen: Routes.PERPS.PERPS_HOME,
    params: extraParams,
  };
};

/**
 * Non-hook variant of {@link resolvePerpsHomeNavigationTarget}, for call
 * sites outside React (e.g. deeplink handlers) that only have access to
 * plain Redux state.
 */
export const getPerpsHomeNavigationTarget = (
  state: RootState,
  extraParams: Record<string, unknown> = {},
): PerpsHomeNavigationTarget =>
  resolvePerpsHomeNavigationTarget(isPerpsProModeActive(state), extraParams);

/**
 * React hook returning a function that resolves the "go to Perps home"
 * navigation target, honoring the current Pro-mode state.
 */
export const useGetPerpsHomeNavigationTarget = (): ((
  extraParams?: Record<string, unknown>,
) => PerpsHomeNavigationTarget) => {
  const isProModeActive = useIsPerpsProModeActive();

  return useCallback(
    (extraParams?: Record<string, unknown>) =>
      resolvePerpsHomeNavigationTarget(isProModeActive, extraParams),
    [isProModeActive],
  );
};

/**
 * Casts a resolved {@link PerpsHomeNavigationTarget} into the shape expected
 * by `navigate(Routes.PERPS.ROOT, ...)`.
 *
 * `Routes.PERPS.*` constants are plain `string`s (not `as const` literals),
 * so TypeScript can't correlate `screen`/`params` through the union without
 * an assertion — the same trade-off already accepted elsewhere in the
 * codebase for dynamic screen names (e.g. `PerpsStackParamList` navigation
 * in `usePerpsNavigationHandlers.ts`, or `app/components/UI/Rewards/utils.ts`).
 * Centralized here so every "go to Perps home" call site shares one
 * reviewed assertion instead of repeating it.
 */
export const toPerpsNavigatorScreenParams = (
  target: PerpsHomeNavigationTarget,
): NavigatorScreenParams<PerpsStackParamList> =>
  target as unknown as NavigatorScreenParams<PerpsStackParamList>;

/**
 * Navigates directly (not nested under `Routes.PERPS.ROOT`) to a resolved
 * {@link PerpsHomeNavigationTarget}. Same rationale as
 * {@link toPerpsNavigatorScreenParams}: `navigate()`'s overloaded signature
 * can't be satisfied by a dynamically-resolved screen/params pair, so the
 * assertion is centralized here (mirrors `navigateWithDetails` in
 * `app/util/navigation/navUtils.ts`).
 */
export const navigateToPerpsHomeTarget = (
  navigation: { navigate: (...args: never[]) => void },
  target: PerpsHomeNavigationTarget,
): void => {
  (navigation.navigate as unknown as (screen: string, params?: object) => void)(
    target.screen,
    target.params,
  );
};

/**
 * Returns a function that jumps into the Perps stack at its Pro-aware "home"
 * screen, entering through `Routes.PERPS.ROOT`.
 *
 * For call sites outside the Perps stack — other navigators (Activity details,
 * the in-app browser, transaction confirmations) and the Perps modal stack —
 * which cannot reach `Routes.PERPS.PERPS_HOME` directly. Screens already inside
 * the stack should use `usePerpsNavigation().navigateToHome` instead.
 */
export const useNavigateToPerpsHome = (): ((
  extraParams?: Record<string, unknown>,
) => void) => {
  const navigation = useNavigation();
  const getTarget = useGetPerpsHomeNavigationTarget();

  return useCallback(
    (extraParams?: Record<string, unknown>) => {
      // Same assertion rationale as `navigateToPerpsHomeTarget`: the nested
      // screen name is resolved at runtime, so `navigate()`'s overloads can't
      // correlate it with its params.
      const navigate = navigation.navigate as unknown as (
        screen: string,
        params: NavigatorScreenParams<PerpsStackParamList>,
      ) => void;

      navigate(
        Routes.PERPS.ROOT,
        toPerpsNavigatorScreenParams(getTarget(extraParams)),
      );
    },
    [navigation, getTarget],
  );
};
