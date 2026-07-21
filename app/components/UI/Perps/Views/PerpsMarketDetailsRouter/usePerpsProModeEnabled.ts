/**
 * Temporary gate for the Perps Pro-mode layout.
 *
 * TODO(TAT-3551): replace this placeholder once the mobile feature-flag and
 * mode selectors land. The Pro view should render only when the feature flag
 * is enabled and the persisted controller mode is `PerpsMode.Pro`. Until then
 * this always returns `false`, so every user keeps the lite
 * `PerpsMarketDetailsView` and the Pro layout is not user-reachable.
 *
 * @returns Whether the Perps Pro-mode layout is enabled for the current user.
 */
export const usePerpsProModeEnabled = (): boolean => false;
