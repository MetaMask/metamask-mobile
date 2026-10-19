import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type {
  NativeBottomTabNavigationOptions,
  NativeBottomTabNavigationProp,
} from '@react-navigation/bottom-tabs/unstable';
import type { ParamListBase } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { selectChainId } from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import type { HeaderNavBarTrailingAction } from '../../../Views/Homepage/abTestConfig';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { trackExploreSearchOpened } from '../../../Views/TrendingView/search/analytics';
import ExploreSearchScreen from '../../../Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import { NATIVE_TRADE_ICONS } from './homeTabs.icons';
import { SEARCH_TAB_NAME, TRADE_TAB_NAME } from './homeTabs.mappers';

type NativeTabNavigation = NativeBottomTabNavigationProp<ParamListBase>;

export interface NativeSystemSlotTab {
  name: string;
  options: NativeBottomTabNavigationOptions;
  listeners: (props: { navigation: NativeTabNavigation }) => {
    tabPress: () => void;
  };
  component: React.ComponentType;
}

const TradeTabScene = () => null;

/** The detached system-search slot: Search or, in the trade-focused arm, Trade. */
export const useNativeSystemSlotTab = (
  trailingAction: HeaderNavBarTrailingAction,
): NativeSystemSlotTab => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const chainId = useSelector(selectChainId);
  const [isTradeTrayOpen, setIsTradeTrayOpen] = useState(false);

  const openTradeTray = useCallback(
    (navigation: NativeTabNavigation) => {
      playImpact(ImpactMoment.TabChange);
      setIsTradeTrayOpen(true);
      // The native circle cannot be measured, so the tray skips its cut-out.
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
        params: {
          onDismiss: () => setIsTradeTrayOpen(false),
          hasBottomNotch: false,
          anchorsToTabBar: true,
        },
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ACTIONS_BUTTON_CLICKED)
          .addProperties({
            text: '',
            chain_id: getDecimalChainId(chainId),
          })
          .build(),
      );
    },
    [chainId, createEventBuilder, trackEvent],
  );

  return useMemo<NativeSystemSlotTab>(() => {
    if (trailingAction === 'trade') {
      return {
        name: TRADE_TAB_NAME,
        options: {
          tabBarSystemItem: 'search',
          // A button, not a tab; UIKit gives non-selectable items no press glow.
          tabBarSelectionEnabled: false,
          tabBarLabel: strings('bottom_nav.trade'),
          tabBarIcon: () => ({
            type: 'image',
            source: isTradeTrayOpen
              ? NATIVE_TRADE_ICONS.open
              : NATIVE_TRADE_ICONS.closed,
            tinted: true,
          }),
        },
        listeners: ({ navigation }) => ({
          tabPress: () => openTradeTray(navigation),
        }),
        component: TradeTabScene,
      };
    }
    return {
      name: SEARCH_TAB_NAME,
      options: { tabBarSystemItem: 'search' },
      listeners: () => ({
        tabPress: () => {
          playImpact(ImpactMoment.TabChange);
          trackExploreSearchOpened('nav_bar');
        },
      }),
      component: ExploreSearchScreen,
    };
  }, [isTradeTrayOpen, openTradeTray, trailingAction]);
};

export default useNativeSystemSlotTab;
