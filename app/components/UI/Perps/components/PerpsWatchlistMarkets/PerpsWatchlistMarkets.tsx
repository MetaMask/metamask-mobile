import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  type PerpsMarketData,
  type Position,
  type Order,
} from '@metamask/perps-controller';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsWatchlistMarkets.styles';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import PerpsSwipeableMarketRow from './PerpsSwipeableMarketRow';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import { PerpsWatchlistSelectorsIDs } from '../../Perps.testIds';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

interface PerpsWatchlistMarketsProps {
  markets: PerpsMarketData[];
  isLoading?: boolean;
  /** Positions from parent - avoids duplicate WebSocket subscriptions */
  positions?: Position[];
  /** Orders from parent - avoids duplicate WebSocket subscriptions */
  orders?: Order[];
  /** Analytics source identifying the parent screen (e.g., 'perps_home') */
  source?: string;
  /** Bound onto market-details routes for downstream transaction attribution. */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /** Override section styles (e.g., to adjust margins) */
  sectionStyle?: StyleProp<ViewStyle>;
  /** Override header styles (e.g., to remove horizontal padding) */
  headerStyle?: StyleProp<ViewStyle>;
  /** Override content container styles (e.g., to remove horizontal margin) */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Markets recommended for users with an empty watchlist */
  recommendedMarkets?: PerpsMarketData[];
  /** Callback when user taps "Add" on a recommended market */
  onAddToWatchlist?: (symbol: string) => void;
  /** Callback when user swipe-dismisses a recommended market */
  onDismissRecommendation?: (symbol: string) => void;
  /** When true, the user has dismissed a recommendation and the empty state is hidden */
  hasUserDismissed?: boolean;
  /** Callback when user taps the section header */
  onHeaderPress?: () => void;
}

const PerpsWatchlistMarkets: React.FC<PerpsWatchlistMarketsProps> = ({
  markets,
  isLoading,
  positions = [],
  orders = [],
  source,
  transactionActiveAbTests,
  sectionStyle,
  headerStyle,
  contentContainerStyle,
  recommendedMarkets = [],
  onAddToWatchlist,
  onDismissRecommendation,
  hasUserDismissed = false,
  onHeaderPress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      const hasPosition = positions.some((p) => p.symbol === market.symbol);
      const hasOrder = orders.some((o) => o.symbol === market.symbol);

      let initialTab: 'position' | 'orders' | undefined;
      if (hasPosition) {
        initialTab = 'position';
      } else if (hasOrder) {
        initialTab = 'orders';
      }

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          initialTab,
          source,
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        },
      });
    },
    [navigation, positions, orders, source, transactionActiveAbTests],
  );

  const collapsedLimit = HOME_SCREEN_CONFIG.WatchlistCollapsedLimit;
  const hasMoreMarkets = markets.length > collapsedLimit;
  const hiddenCount = markets.length - collapsedLimit;

  const visibleMarkets = useMemo(() => {
    if (!hasMoreMarkets || isExpanded) {
      return markets;
    }
    return markets.slice(0, collapsedLimit);
  }, [markets, hasMoreMarkets, isExpanded, collapsedLimit]);

  const renderMarket = useCallback(
    ({ item }: { item: PerpsMarketData }) => (
      <PerpsMarketRowItem
        market={item}
        showBadge={false}
        onPress={() => handleMarketPress(item)}
      />
    ),
    [handleMarketPress],
  );

  const renderRecommendedMarket = useCallback(
    ({ item }: { item: PerpsMarketData }) => (
      <PerpsSwipeableMarketRow
        market={item}
        onAdd={onAddToWatchlist ?? (() => undefined)}
        onDismiss={onDismissRecommendation ?? (() => undefined)}
      />
    ),
    [onAddToWatchlist, onDismissRecommendation],
  );

  const SectionHeader = useCallback(
    () => (
      <TouchableOpacity
        style={[styles.header, headerStyle]}
        onPress={onHeaderPress}
        disabled={!onHeaderPress}
        testID={PerpsWatchlistSelectorsIDs.HEADER}
        accessibilityRole="button"
      >
        <View style={styles.titleRow}>
          <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
            {strings('perps.home.watchlist')}
          </Text>
          {onHeaderPress && (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={TextColor.Alternative}
            />
          )}
        </View>
      </TouchableOpacity>
    ),
    [styles.header, styles.titleRow, headerStyle, onHeaderPress],
  );

  if (isLoading) {
    return (
      <View
        style={[styles.section, sectionStyle]}
        testID={PerpsWatchlistSelectorsIDs.SECTION}
      >
        <SectionHeader />
        <View style={contentContainerStyle}>
          <PerpsRowSkeleton count={3} />
        </View>
      </View>
    );
  }

  // Empty watchlist — show recommended markets (unless user has dismissed)
  if (markets.length === 0) {
    if (hasUserDismissed || recommendedMarkets.length === 0) {
      return null;
    }

    return (
      <View
        style={[styles.section, sectionStyle]}
        testID={PerpsWatchlistSelectorsIDs.SECTION}
      >
        <SectionHeader />
        <View style={styles.recommendedSubheader}>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('perps.home.watchlist_recommended')}
          </Text>
        </View>
        <View
          style={contentContainerStyle}
          testID={PerpsWatchlistSelectorsIDs.RECOMMENDED_SECTION}
        >
          <FlatList
            data={recommendedMarkets}
            renderItem={renderRecommendedMarket}
            keyExtractor={(item) => item.symbol}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    );
  }

  // Populated watchlist — with collapse/expand for >3 markets
  return (
    <View
      style={[styles.section, sectionStyle]}
      testID={PerpsWatchlistSelectorsIDs.SECTION}
    >
      <SectionHeader />
      <View style={contentContainerStyle}>
        <FlatList
          data={visibleMarkets}
          renderItem={renderMarket}
          keyExtractor={(item) => item.symbol}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
        {hasMoreMarkets && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setIsExpanded((prev) => !prev)}
            testID={
              isExpanded
                ? PerpsWatchlistSelectorsIDs.SHOW_LESS_BUTTON
                : PerpsWatchlistSelectorsIDs.VIEW_MORE_BUTTON
            }
          >
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Primary}>
              {isExpanded
                ? strings('perps.home.watchlist_show_less')
                : strings('perps.home.watchlist_view_more', {
                    count: String(hiddenCount),
                  })}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default PerpsWatchlistMarkets;
