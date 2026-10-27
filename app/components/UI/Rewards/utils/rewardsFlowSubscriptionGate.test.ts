import Routes from '../../../../constants/navigation/Routes';
import {
  isRewardsMoneyFlowScreen,
  rewardsFlowFocusedScreen,
  rewardsFlowRequestedScreen,
} from './rewardsFlowSubscriptionGate';

describe('rewardsFlowFocusedScreen', () => {
  it('uses the child route once the inner stack has one', () => {
    const focused = rewardsFlowFocusedScreen(
      Routes.REWARDS_SETTINGS_VIEW,
      Routes.REWARDS_EARNINGS_HISTORY_VIEW,
    );

    expect(focused).toBe(Routes.REWARDS_SETTINGS_VIEW);
  });

  it('uses the nested screen param before the inner stack mounts', () => {
    const focused = rewardsFlowFocusedScreen(
      Routes.REWARDS_FLOW,
      Routes.REWARDS_TRADING_REBATES_VIEW,
    );

    expect(focused).toBe(Routes.REWARDS_TRADING_REBATES_VIEW);
  });

  it('uses the nested screen param when no route name is available', () => {
    const focused = rewardsFlowFocusedScreen(
      undefined,
      Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
    );

    expect(focused).toBe(Routes.REWARDS_TRADING_COMMISSIONS_VIEW);
  });
});

describe('isRewardsMoneyFlowScreen', () => {
  it.each([
    Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
    Routes.REWARDS_TRADING_REBATES_VIEW,
    Routes.REWARDS_EARNINGS_HISTORY_VIEW,
  ])('accepts %s without a points subscription', (screen) => {
    expect(isRewardsMoneyFlowScreen(screen)).toBe(true);
  });

  it('rejects a points screen', () => {
    expect(isRewardsMoneyFlowScreen(Routes.REWARDS_SETTINGS_VIEW)).toBe(false);
  });
});

describe('rewardsFlowRequestedScreen', () => {
  it('reads the nested screen param', () => {
    const screen = rewardsFlowRequestedScreen({
      screen: Routes.REWARDS_EARNINGS_HISTORY_VIEW,
    });

    expect(screen).toBe(Routes.REWARDS_EARNINGS_HISTORY_VIEW);
  });

  it('returns undefined when the route has no screen param', () => {
    expect(rewardsFlowRequestedScreen(undefined)).toBeUndefined();
    expect(rewardsFlowRequestedScreen({})).toBeUndefined();
  });
});
