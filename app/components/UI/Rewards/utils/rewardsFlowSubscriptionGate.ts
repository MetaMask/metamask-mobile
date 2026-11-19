import Routes from '../../../../constants/navigation/Routes';

/**
 * Screens on `REWARDS_FLOW` that do not need a points subscription.
 * Settings is the Money referral code entry, and the navigator keeps it only
 * while that section has a cached payload. The ledger screens are what a
 * referee who never opted into points still opens from the Money dashboard.
 */
export const REWARDS_MONEY_FLOW_SCREENS = [
  Routes.REWARDS_SETTINGS_VIEW,
  Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
  Routes.REWARDS_TRADING_REBATES_VIEW,
  Routes.REWARDS_EARNINGS_HISTORY_VIEW,
] as const;

export type RewardsMoneyFlowScreen =
  (typeof REWARDS_MONEY_FLOW_SCREENS)[number];

export function isRewardsMoneyFlowScreen(
  screen: string | undefined,
): screen is RewardsMoneyFlowScreen {
  return (
    screen != null &&
    (REWARDS_MONEY_FLOW_SCREENS as readonly string[]).includes(screen)
  );
}

/**
 * The screen this flow is opening. Once the inner stack has a child route,
 * that route wins. Before it mounts, the active name is still `REWARDS_FLOW`
 * and the nested `screen` param is the destination.
 */
export function rewardsFlowFocusedScreen(
  activeRouteName: string | undefined,
  requestedScreen: string | undefined,
): string | undefined {
  if (activeRouteName && activeRouteName !== Routes.REWARDS_FLOW) {
    return activeRouteName;
  }
  return requestedScreen;
}

export function rewardsFlowRequestedScreen(
  params: object | undefined,
): string | undefined {
  if (!params || !('screen' in params)) {
    return undefined;
  }
  const { screen } = params as { screen?: unknown };
  return typeof screen === 'string' ? screen : undefined;
}
