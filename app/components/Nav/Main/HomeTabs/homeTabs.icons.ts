import tabIconHome from '../../../../images/tab-icons/home.png';
import tabIconHomeSelected from '../../../../images/tab-icons/home-selected.png';
import tabIconExplore from '../../../../images/tab-icons/explore.png';
import tabIconExploreSelected from '../../../../images/tab-icons/explore-selected.png';
import tabIconMoney from '../../../../images/tab-icons/money.png';
import tabIconMoneySelected from '../../../../images/tab-icons/money-selected.png';
import tabIconActivity from '../../../../images/tab-icons/activity.png';
import tabIconActivitySelected from '../../../../images/tab-icons/activity-selected.png';
import tabIconRewards from '../../../../images/tab-icons/rewards.png';
import tabIconRewardsSelected from '../../../../images/tab-icons/rewards-selected.png';
import tabIconSocial from '../../../../images/tab-icons/social.png';
import tabIconSocialSelected from '../../../../images/tab-icons/social-selected.png';
import tabIconTrade from '../../../../images/tab-icons/trade.png';
import tabIconTradeClose from '../../../../images/tab-icons/trade-close.png';
import type { HomeTabKey, NativeTabIconPair } from './homeTabs.types';

/** Rasterised from the design-system glyphs the floating bar draws; tinted by UIKit. */
export const NATIVE_TAB_ICONS: Record<
  Exclude<HomeTabKey, 'browser'>,
  NativeTabIconPair
> = {
  home: { source: tabIconHome, selectedSource: tabIconHomeSelected },
  explore: { source: tabIconExplore, selectedSource: tabIconExploreSelected },
  money: { source: tabIconMoney, selectedSource: tabIconMoneySelected },
  activity: {
    source: tabIconActivity,
    selectedSource: tabIconActivitySelected,
  },
  rewards: { source: tabIconRewards, selectedSource: tabIconRewardsSelected },
  social: { source: tabIconSocial, selectedSource: tabIconSocialSelected },
};

/** The floating bar's 24pt `Add` glyph, plain and rotated into a close mark. */
export const NATIVE_TRADE_ICONS = {
  closed: tabIconTrade,
  open: tabIconTradeClose,
};
