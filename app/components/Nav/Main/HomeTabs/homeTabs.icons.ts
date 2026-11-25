import type { ImageSourcePropType } from 'react-native';
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
import tradeIconEl from '../../../../images/tab-icons/trade/trade-el.png';
import tradeCloseIconEl from '../../../../images/tab-icons/trade/trade-close-el.png';
import tradeIconEn from '../../../../images/tab-icons/trade/trade-en.png';
import tradeCloseIconEn from '../../../../images/tab-icons/trade/trade-close-en.png';
import tradeIconEs from '../../../../images/tab-icons/trade/trade-es.png';
import tradeCloseIconEs from '../../../../images/tab-icons/trade/trade-close-es.png';
import tradeIconFr from '../../../../images/tab-icons/trade/trade-fr.png';
import tradeCloseIconFr from '../../../../images/tab-icons/trade/trade-close-fr.png';
import tradeIconHi from '../../../../images/tab-icons/trade/trade-hi.png';
import tradeCloseIconHi from '../../../../images/tab-icons/trade/trade-close-hi.png';
import tradeIconId from '../../../../images/tab-icons/trade/trade-id.png';
import tradeCloseIconId from '../../../../images/tab-icons/trade/trade-close-id.png';
import tradeIconJa from '../../../../images/tab-icons/trade/trade-ja.png';
import tradeCloseIconJa from '../../../../images/tab-icons/trade/trade-close-ja.png';
import tradeIconKo from '../../../../images/tab-icons/trade/trade-ko.png';
import tradeCloseIconKo from '../../../../images/tab-icons/trade/trade-close-ko.png';
import tradeIconPt from '../../../../images/tab-icons/trade/trade-pt.png';
import tradeCloseIconPt from '../../../../images/tab-icons/trade/trade-close-pt.png';
import tradeIconRu from '../../../../images/tab-icons/trade/trade-ru.png';
import tradeCloseIconRu from '../../../../images/tab-icons/trade/trade-close-ru.png';
import tradeIconTl from '../../../../images/tab-icons/trade/trade-tl.png';
import tradeCloseIconTl from '../../../../images/tab-icons/trade/trade-close-tl.png';
import tradeIconTr from '../../../../images/tab-icons/trade/trade-tr.png';
import tradeCloseIconTr from '../../../../images/tab-icons/trade/trade-close-tr.png';
import tradeIconVi from '../../../../images/tab-icons/trade/trade-vi.png';
import tradeCloseIconVi from '../../../../images/tab-icons/trade/trade-close-vi.png';
import tradeIconZh from '../../../../images/tab-icons/trade/trade-zh.png';
import tradeCloseIconZh from '../../../../images/tab-icons/trade/trade-close-zh.png';
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

interface NativeTradeIcons {
  closed: ImageSourcePropType;
  open: ImageSourcePropType;
}

/**
 * UIKit never labels the detached system slot, so the translated "Trade" label
 * is baked into the glyph. German uses the English word.
 */
const ENGLISH_TRADE_ICONS: NativeTradeIcons = {
  closed: tradeIconEn,
  open: tradeCloseIconEn,
};

const NATIVE_TRADE_ICONS_BY_LANGUAGE: Record<string, NativeTradeIcons> = {
  de: ENGLISH_TRADE_ICONS,
  el: { closed: tradeIconEl, open: tradeCloseIconEl },
  en: ENGLISH_TRADE_ICONS,
  es: { closed: tradeIconEs, open: tradeCloseIconEs },
  fr: { closed: tradeIconFr, open: tradeCloseIconFr },
  hi: { closed: tradeIconHi, open: tradeCloseIconHi },
  id: { closed: tradeIconId, open: tradeCloseIconId },
  ja: { closed: tradeIconJa, open: tradeCloseIconJa },
  ko: { closed: tradeIconKo, open: tradeCloseIconKo },
  pt: { closed: tradeIconPt, open: tradeCloseIconPt },
  ru: { closed: tradeIconRu, open: tradeCloseIconRu },
  tl: { closed: tradeIconTl, open: tradeCloseIconTl },
  tr: { closed: tradeIconTr, open: tradeCloseIconTr },
  vi: { closed: tradeIconVi, open: tradeCloseIconVi },
  zh: { closed: tradeIconZh, open: tradeCloseIconZh },
};

/** Picks the Trade glyph for an i18n locale such as `pt` or `ja-JP`, falling back to English. */
export const getNativeTradeIcons = (locale: string): NativeTradeIcons =>
  NATIVE_TRADE_ICONS_BY_LANGUAGE[locale.split('-')[0].toLowerCase()] ??
  ENGLISH_TRADE_ICONS;
