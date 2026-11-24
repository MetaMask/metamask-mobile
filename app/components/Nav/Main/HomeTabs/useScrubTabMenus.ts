import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { IconName } from '@metamask/design-system-react-native';

import { TabBarIconKey } from '../../../../component-library/components/Navigation/TabBar/TabBar.types';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import {
  PredictEventValues,
  selectPredictAvailability,
  usePredictEntryActions,
} from '../../../UI/PredictNext';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectCollectiblesEnabled } from '../../../UI/Collectibles/selectors/featureFlags';
import {
  collectiblesRoutes,
  type CollectiblesParamList,
} from '../../../UI/Collectibles/routeNames';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../UI/Bridge/hooks/useSwapBridgeNavigation';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import { TimeOption } from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import { navigateToExplorePredictionsList } from '../../../Views/TrendingView/feeds/predictions/predictionsNavigation';
import { navigateToPerpsMarketList } from '../../../Views/TrendingView/feeds/perps/perpsNavigation';
import { navigateToSocialTab } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { SOCIAL_V1_TAB_ORDER } from '../../../Views/SocialLeaderboard/shell/tabConfig';

export interface ScrubTabMenuItem {
  label: string;
  iconName: IconName;
  onPress: () => void;
  /** The item navigates to its own tab, so the bar doesn't switch first. */
  opensTab?: boolean;
}

/** A popover of items, or an action that runs on long press. */
export type ScrubTabMenu = ScrubTabMenuItem[] | (() => void);

/**
 * POC: what a long press on each tab does. Tabs left out have no menu.
 * Skips the analytics the real entry points fire.
 */
export const useScrubTabMenus = (): Partial<
  Record<TabBarIconKey, ScrubTabMenu>
> => {
  const navigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const collectiblesNavigation =
    useNavigation<NavigationProp<CollectiblesParamList>>();
  const { openPredict } = usePredictEntryActions();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictAvailability);
  const isCollectiblesEnabled = useSelector(selectCollectiblesEnabled);
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'MainView',
  });

  const earnItem: ScrubTabMenuItem = useMemo(
    () => ({
      label: 'Earn',
      iconName: IconName.Plant,
      onPress: () =>
        navigation.navigate(Routes.EARN.ROOT, {
          screen: Routes.EARN.SEARCH_LIST,
        }),
    }),
    [navigation],
  );

  // The trade tray's options, in its order and behind its flags.
  const tradeItems = useMemo<ScrubTabMenuItem[]>(
    () => [
      {
        label: strings('asset_overview.swap'),
        iconName: IconName.SwapVertical,
        onPress: goToSwaps,
      },
      ...(isPerpsEnabled
        ? [
            {
              label: strings('asset_overview.perps_button'),
              iconName: IconName.Infinity,
              onPress: () => navigation.navigate(Routes.PERPS.ROOT),
            },
          ]
        : []),
      ...(isCollectiblesEnabled
        ? [
            {
              label: strings('collectibles.title'),
              iconName: IconName.Gift,
              onPress: () =>
                collectiblesNavigation.navigate(collectiblesRoutes.root),
            },
          ]
        : []),
      ...(isPredictEnabled
        ? [
            {
              label: strings('asset_overview.predict_button'),
              iconName: IconName.Predictions,
              onPress: () =>
                openPredict({
                  type: 'home',
                  entryPoint: PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON,
                }),
            },
          ]
        : []),
      earnItem,
    ],
    [
      collectiblesNavigation,
      earnItem,
      goToSwaps,
      isCollectiblesEnabled,
      isPerpsEnabled,
      isPredictEnabled,
      navigation,
      openPredict,
    ],
  );

  return useMemo(
    () => ({
      [TabBarIconKey.Wallet]: tradeItems,

      [TabBarIconKey.Trending]: [
        {
          label: 'Predictions',
          iconName: IconName.Predictions,
          onPress: () =>
            navigateToExplorePredictionsList(openPredict, 'trending'),
        },
        {
          label: 'Crypto movers',
          iconName: IconName.TrendUp,
          onPress: () =>
            navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW, {
              initialTimeOption: TimeOption.OneHour,
              entryPoint: 'crypto_movers',
              quickBuySource: 'explore_now',
            }),
        },
        {
          label: 'Perps movers',
          iconName: IconName.Candlestick,
          onPress: () =>
            navigateToPerpsMarketList(perpsNavigation, 'all', 'priceChange', {
              sortDirection: 'desc',
            }),
        },
        earnItem,
      ],

      [TabBarIconKey.Money]: [
        {
          label: strings('money.action.add'),
          iconName: IconName.Add,
          onPress: () =>
            navigation.navigate(Routes.MONEY.MODALS.ROOT, {
              screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
            }),
        },
        {
          label: strings('money.action.move'),
          iconName: IconName.Arrow2UpRight,
          onPress: () =>
            navigation.navigate(Routes.MONEY.MODALS.ROOT, {
              screen: Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET,
            }),
        },
        {
          label: strings('money.action.card'),
          iconName: IconName.Card,
          onPress: () =>
            navigation.navigate(Routes.CARD.ROOT, { screen: Routes.CARD.HOME }),
        },
      ],

      // Social V1 opens on the chosen inner tab; V0 has no such tabs.
      [TabBarIconKey.Social]: SOCIAL_V1_TAB_ORDER.map((tab) => ({
        label: strings(`social_leaderboard.feed.tabs.${tab}`),
        iconName: IconName.People,
        onPress: () =>
          navigateToSocialTab(navigation.navigate, {
            source: 'nav_tab_menu',
            initialTab: tab,
          }),
        opensTab: true,
      })),
    }),
    [earnItem, navigation, openPredict, perpsNavigation, tradeItems],
  );
};
