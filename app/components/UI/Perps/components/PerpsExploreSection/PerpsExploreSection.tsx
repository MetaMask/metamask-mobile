import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionHeader,
} from '@metamask/design-system-react-native';
import {
  MARKET_SORTING_CONFIG,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  sortMarkets,
  type MarketTypeFilter,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useTheme } from '../../../../../util/theme';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import {
  selectPerpsProductsEnabledFlag,
  selectPerpsWatchlistEnabledFlag,
} from '../../selectors/featureFlags';
import { selectPerpsWatchlistMarkets } from '../../selectors/perpsController';
import { usePerpsCategories } from '../../hooks/usePerpsCategories';
import { useHasNewMarkets } from '../../hooks/useHasNewMarkets';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import {
  getCategoryIconName,
  MEMECOIN_CATEGORY_ID,
} from '../../constants/categoryIcons';
import PerpsSentimentSatisfiedIcon, {
  PERPS_SENTIMENT_ICON_SIZE_SM,
} from '../PerpsSentimentSatisfiedIcon/PerpsSentimentSatisfiedIcon';
import { PillScrollList } from '../../../Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../Trending/components/SectionPillsSkeleton';
import PerpsMarketList from '../PerpsMarketList';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import { filterMarketsByCategory } from '../../utils/marketCategoryMapping';
import { buildExploreTabs } from './buildExploreTabs';
import {
  readExploreSessionTab,
  writeExploreSessionTab,
} from './exploreSessionTab';
import {
  EXPLORE_WATCHLIST_TAB_ID,
  type ExploreTab,
  type ExploreTabId,
  type PerpsExploreSectionProps,
} from './PerpsExploreSection.types';

const TEST_ID = PerpsHomeViewSelectorsIDs.EXPLORE_SECTION;
const EXPLORE_MARKET_LIMIT = HOME_SCREEN_CONFIG.TrendingMarketsLimit;
const EXPLORE_TAB_ROW_COUNT = 2;

const SOURCE_SECTION_BY_TAB: Partial<Record<ExploreTabId, string>> = {
  [EXPLORE_WATCHLIST_TAB_ID]: PERPS_EVENT_VALUE.SOURCE_SECTION.WATCHLIST,
  crypto: PERPS_EVENT_VALUE.SOURCE_SECTION.CRYPTO,
  commodity: PERPS_EVENT_VALUE.SOURCE_SECTION.COMMODITY,
  stock: PERPS_EVENT_VALUE.SOURCE_SECTION.STOCK,
  forex: PERPS_EVENT_VALUE.SOURCE_SECTION.FOREX,
};

const EXPLORE_ANALYTICS = {
  BUTTON_CLICKED: 'explore_tab_tapped',
  PROPERTY_CATEGORY: 'category',
} as const;

function resolveDefaultExploreTab(
  tabs: ExploreTab[],
  watchlistCount: number,
  isWatchlistEnabled: boolean,
): ExploreTabId | null {
  if (
    isWatchlistEnabled &&
    watchlistCount > 0 &&
    tabs.some((tab) => tab.id === EXPLORE_WATCHLIST_TAB_ID)
  ) {
    return EXPLORE_WATCHLIST_TAB_ID;
  }

  const cryptoTab = tabs.find((tab) => tab.id === 'crypto');
  if (cryptoTab) {
    return cryptoTab.id;
  }

  return tabs.find((tab) => tab.id !== EXPLORE_WATCHLIST_TAB_ID)?.id ?? null;
}

function isCategoryTab(
  tabId: ExploreTabId,
): tabId is Exclude<MarketTypeFilter, 'all'> {
  return tabId !== EXPLORE_WATCHLIST_TAB_ID;
}

/**
 * Treatment replacement for the stacked Watchlist, Products, and category
 * sections on Perps home. Category pills use the same two-row scroller as
 * Products. The market rows reuse PerpsMarketList.
 */
const PerpsExploreSection: React.FC<PerpsExploreSectionProps> = ({
  transactionActiveAbTests,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { colors } = useTheme();
  const isWatchlistEnabled = useSelector(selectPerpsWatchlistEnabledFlag);
  const isProductsEnabled = useSelector(selectPerpsProductsEnabledFlag);
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);
  const categories = usePerpsCategories();
  const hasNewMarkets = useHasNewMarkets();
  const { markets, isLoading: isMarketsLoading } = usePerpsMarkets({
    skipInitialFetch: false,
    showZeroVolume: __DEV__,
  });

  const [userTab, setUserTab] = useState<ExploreTabId | null>(
    readExploreSessionTab,
  );

  const tabs = useMemo(
    () =>
      buildExploreTabs({
        categories,
        isProductsEnabled,
        isWatchlistEnabled,
        hasNewMarkets,
      }),
    [categories, hasNewMarkets, isProductsEnabled, isWatchlistEnabled],
  );

  const watchlistMarkets = useMemo(
    () => markets.filter((market) => watchlistSymbols.includes(market.symbol)),
    [markets, watchlistSymbols],
  );

  // Stay on the skeleton until markets (and therefore the watchlist derived
  // from them) have loaded, so the default never paints Crypto and then
  // jumps to Watchlist. An explicit session selection still wins afterwards.
  const activeTab: ExploreTabId | null = isMarketsLoading
    ? null
    : userTab && tabs.some((tab) => tab.id === userTab)
      ? userTab
      : resolveDefaultExploreTab(
          tabs,
          watchlistMarkets.length,
          isWatchlistEnabled,
        );

  const visibleMarkets = useMemo(() => {
    if (!activeTab) {
      return [];
    }

    if (!isCategoryTab(activeTab)) {
      return watchlistMarkets.slice(0, EXPLORE_MARKET_LIMIT);
    }

    return sortMarkets({
      markets: filterMarketsByCategory(markets, activeTab),
      sortBy: MARKET_SORTING_CONFIG.SortFields.Volume,
      direction: MARKET_SORTING_CONFIG.DefaultDirection,
    }).slice(0, EXPLORE_MARKET_LIMIT);
  }, [activeTab, markets, watchlistMarkets]);

  const openMarketList = useCallback(() => {
    if (!activeTab) {
      return;
    }

    const sharedParams = {
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      ...(transactionActiveAbTests?.length ? { transactionActiveAbTests } : {}),
    };

    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params:
        activeTab === EXPLORE_WATCHLIST_TAB_ID
          ? { showWatchlistOnly: true, ...sharedParams }
          : { defaultMarketTypeFilter: activeTab, ...sharedParams },
    });
  }, [activeTab, navigation, transactionActiveAbTests]);

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
          ...(activeTab
            ? {
                source_section: SOURCE_SECTION_BY_TAB[activeTab] ?? activeTab,
              }
            : {}),
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        },
      });
    },
    [activeTab, navigation, transactionActiveAbTests],
  );

  const handleTabPress = useCallback(
    (tab: ExploreTab, index: number) => {
      setUserTab(tab.id);
      writeExploreSessionTab(tab.id);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
          .addProperties({
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
            [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
              EXPLORE_ANALYTICS.BUTTON_CLICKED,
            [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
              PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
            [EXPLORE_ANALYTICS.PROPERTY_CATEGORY]: tab.id,
            pill_position: index,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const renderTab = useCallback(
    (tab: ExploreTab, index: number) => {
      const isSelected = tab.id === activeTab;
      const isMemecoin = tab.id === MEMECOIN_CATEGORY_ID;
      const iconColor = isSelected
        ? IconColor.PrimaryInverse
        : IconColor.IconAlternative;

      const sharedProps = {
        variant: isSelected ? ButtonVariant.Primary : ButtonVariant.Tertiary,
        size: ButtonSize.Sm,
        onPress: () => handleTabPress(tab, index),
        testID: `${TEST_ID}-tab-${tab.id}`,
        accessibilityLabel: tab.label,
        accessibilityState: { selected: isSelected },
      };

      // The star is the button content, not a start accessory. ButtonBase
      // otherwise keeps a label gap and wider trailing padding.
      if (tab.iconOnly) {
        return (
          <Button {...sharedProps} twClassName="px-3">
            <Icon
              name={IconName.StarFilled}
              size={IconSize.Sm}
              color={iconColor}
            />
          </Button>
        );
      }

      return (
        <Button
          {...sharedProps}
          startAccessory={
            isMemecoin ? (
              <PerpsSentimentSatisfiedIcon
                size={PERPS_SENTIMENT_ICON_SIZE_SM}
                color={
                  isSelected ? colors.primary.inverse : colors.icon.alternative
                }
              />
            ) : (
              <Icon
                name={getCategoryIconName(tab.id)}
                size={IconSize.Sm}
                color={iconColor}
              />
            )
          }
        >
          {tab.label}
        </Button>
      );
    },
    [
      activeTab,
      colors.icon.alternative,
      colors.primary.inverse,
      handleTabPress,
    ],
  );

  if (!isMarketsLoading && tabs.length === 0) {
    return null;
  }

  return (
    <Box testID={TEST_ID} twClassName="pb-4">
      <SectionHeader
        title={strings('perps.home.explore')}
        isInteractive={activeTab !== null}
        onPress={openMarketList}
        testID={`${TEST_ID}-header`}
      />
      <PillScrollList<ExploreTab>
        data={isMarketsLoading ? [] : tabs}
        isLoading={isMarketsLoading}
        renderItem={renderTab}
        keyExtractor={(tab) => tab.id}
        Skeleton={SectionPillsSkeleton}
        rowCount={EXPLORE_TAB_ROW_COUNT}
        maxPills={tabs.length}
        wrapperTwClassName="bg-transparent"
        listTestId={`${TEST_ID}-tabs`}
      />
      {isMarketsLoading || !activeTab ? (
        <PerpsRowSkeleton count={EXPLORE_MARKET_LIMIT} />
      ) : (
        <>
          <PerpsMarketList
            markets={visibleMarkets}
            onMarketPress={handleMarketPress}
            sortBy={MARKET_SORTING_CONFIG.SortFields.Volume}
            showBadge={false}
            emptyMessage={
              activeTab === EXPLORE_WATCHLIST_TAB_ID
                ? strings('perps.no_favorites_found')
                : undefined
            }
            filterKey={activeTab}
            testID={`${TEST_ID}-list`}
          />
          <Box accessible={false} twClassName="px-4 pt-3">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              isFullWidth
              onPress={openMarketList}
              testID={`${TEST_ID}-see-more`}
            >
              {strings('perps.home.see_more')}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PerpsExploreSection;
