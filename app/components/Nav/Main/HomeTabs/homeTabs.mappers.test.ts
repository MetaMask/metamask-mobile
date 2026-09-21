import { Platform } from 'react-native';

import Routes from '../../../../constants/navigation/Routes';
import { TabBarIconKey } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import {
  isNativeTabBarSupported,
  shouldHideRewardsTabBar,
  TAB_BAR_HIDDEN_STYLE,
  toJsTabOptions,
  toNativeTabOptions,
} from './homeTabs.mappers';
import type { HomeTabDefinition, HomeTabRoute } from './homeTabs.types';

const rewardsRoute = (activeRouteName?: string): HomeTabRoute => ({
  key: 'rewards-key',
  name: Routes.REWARDS_VIEW,
  state: activeRouteName
    ? {
        routes: [
          {
            key: 'nested',
            name: Routes.REWARDS_VIEW,
            state: {
              index: 0,
              routes: [{ key: 'leaf', name: activeRouteName }],
            },
          },
        ],
      }
    : undefined,
});

const homeTab: HomeTabDefinition = {
  key: 'home',
  name: Routes.WALLET.HOME,
  iconKey: TabBarIconKey.Wallet,
  rootScreenName: Routes.WALLET_VIEW,
  nativeIcon: { source: 1, selectedSource: 2 },
  onPress: jest.fn(),
};

describe('isNativeTabBarSupported', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  afterEach(() => {
    Platform.OS = originalOS;
    Object.defineProperty(Platform, 'Version', { value: originalVersion });
  });

  it.each([
    ['ios', '26.0', true],
    ['ios', '26.1.2', true],
    ['ios', '18.5', false],
    ['android', 36, false],
  ])('on %s %s returns %s', (os, version, expected) => {
    Platform.OS = os as typeof Platform.OS;
    Object.defineProperty(Platform, 'Version', { value: version });

    expect(isNativeTabBarSupported()).toBe(expected);
  });
});

describe('shouldHideRewardsTabBar', () => {
  it.each([
    [undefined, false],
    [Routes.REWARDS_DASHBOARD, false],
    [Routes.REWARDS_MONEY_DASHBOARD, false],
    [Routes.REWARDS_ONBOARDING_FLOW, false],
    ['OndoCampaignDetails', true],
  ])('with active route %s hides: %s', (activeRouteName, expected) => {
    expect(shouldHideRewardsTabBar(rewardsRoute(activeRouteName))).toBe(
      expected,
    );
  });
});

describe('toJsTabOptions', () => {
  it('maps the definition onto the JS bars’ option contract', () => {
    const onLeave = jest.fn();
    const isSelected = jest.fn();
    const options = toJsTabOptions({
      ...homeTab,
      onLeave,
      isSelected,
      isHidden: true,
      freezeOnBlur: false,
    });

    expect(options).toMatchObject({
      tabBarIconKey: TabBarIconKey.Wallet,
      rootScreenName: Routes.WALLET_VIEW,
      onLeave,
      isSelected,
      isHidden: true,
      freezeOnBlur: false,
    });
  });

  it('fires the bottom nav event before the tab press side effect', () => {
    const calls: string[] = [];
    const tab: HomeTabDefinition = {
      ...homeTab,
      onPress: () => calls.push('press'),
    };
    const options = toJsTabOptions(tab, {
      trackBottomNavPress: () => calls.push('nav'),
    });

    options.callback?.();

    expect(calls).toEqual(['nav', 'press']);
  });

  it('leaves the bottom nav event to the bar when no tracker is given', () => {
    const options = toJsTabOptions(homeTab);

    options.callback?.();

    expect(homeTab.onPress).toHaveBeenCalledTimes(1);
  });
});

describe('toNativeTabOptions', () => {
  it('uses the localised label as the title and swaps icons on focus', () => {
    const options = toNativeTabOptions(homeTab);
    const tabBarIcon = options.tabBarIcon;

    expect(options.title).toBe('Home');
    expect(typeof tabBarIcon).toBe('function');
    if (typeof tabBarIcon !== 'function') {
      throw new Error('expected an icon resolver');
    }
    expect(tabBarIcon({ focused: false })).toEqual({
      type: 'image',
      source: 1,
      tinted: true,
    });
    expect(tabBarIcon({ focused: true })).toEqual({
      type: 'image',
      source: 2,
      tinted: true,
    });
  });

  it('does not touch the bar style unless the tab asks to hide it', () => {
    const rewardsTab: HomeTabDefinition = {
      ...homeTab,
      key: 'rewards',
      hidesTabBarFor: shouldHideRewardsTabBar,
    };

    expect(
      toNativeTabOptions(rewardsTab, rewardsRoute(Routes.REWARDS_DASHBOARD)),
    ).not.toHaveProperty('tabBarStyle');
    expect(
      toNativeTabOptions(rewardsTab, rewardsRoute('OndoCampaignDetails'))
        .tabBarStyle,
    ).toBe(TAB_BAR_HIDDEN_STYLE);
  });
});
