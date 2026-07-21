/**
 * Temporary gate for the Perps Pro-mode layout.
 *
 * TODO(TAT-3551): replace this placeholder with the real mobile selector
 * wrapper around `selectPerpsMode` from `@metamask/perps-controller` (via
 * `app/components/UI/Perps/selectors/perpsController`) once that package is
 * bumped to expose the `mode` field. Until then this always returns `false`,
 * so every user keeps the lite `PerpsMarketDetailsView` and the Pro layout is
 * not user-reachable.
 *
 * @returns Whether the Perps Pro-mode layout is enabled for the current user.
 */
export const usePerpsProModeEnabled = (): boolean => false;
