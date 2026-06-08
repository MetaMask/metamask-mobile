import React, { useCallback, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
  type Position,
  type Order,
} from '@metamask/perps-controller';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import PerpsSuggestedMarketRow from '../PerpsSuggestedMarketRow/PerpsSuggestedMarketRow';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsWatchlistMarkets.styles';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { usePerpsWatchlistActions } from '../../hooks/usePerpsWatchlistActions';
import { PerpsWatchlistSelectorsIDs } from '../../Perps.testIds';

/** Markets with ≤ this count are shown without a "Show more" toggle. */
const INITIAL_DISPLAY_COUNT = 3;

interface PerpsWatchlistMarketsProps {
  markets: PerpsMarketData[];
  /** Top markets by volume shown in the empty state; omit to hide empty state */
  suggestedMarkets?: PerpsMarketData[];
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
  /** Called when the "Watchlist >" header is pressed */
  onSeeAllPress?: () => void;
}

const PerpsWatchlistMarkets: React.FC<PerpsWatchlistMarketsProps> = ({
  markets,
  suggestedMarkets,
  isLoading,
  positions = [],
  orders = [],
  source,
  transactionActiveAbTests,
  sectionStyle,
  headerStyle,
  contentContainerStyle,
  onSeeAllPress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const [expanded, setExpanded] = useState(false);

  const { addToWatchlist } = usePerpsWatchlistActions(
    PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
  );

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

  const SectionHeader = useCallback(
    () => (
      <TouchableOpacity
        style={[styles.header, headerStyle]}
        onPress={onSeeAllPress}
        disabled={!onSeeAllPress}
        testID={PerpsWatchlistSelectorsIDs.HEADER}
        activeOpacity={onSeeAllPress ? 0.7 : 1}
      >
        <View style={styles.headerLeft}>
          <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
            {strings('perps.home.watchlist')}
          </Text>
          {onSeeAllPress && (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={IconColor.Alternative}
            />
          )}
        </View>
      </TouchableOpacity>
    ),
    [styles.header, styles.headerLeft, headerStyle, onSeeAllPress],
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

  // Empty state — show suggested markets if provided, otherwise hide section
  if (markets.length === 0) {
    if (!suggestedMarkets?.length) {
      return null;
    }

    return (
      <View
        style={[styles.section, sectionStyle]}
        testID={PerpsWatchlistSelectorsIDs.SECTION}
      >
        <SectionHeader />
        <View
          style={[styles.emptyStateContainer, contentContainerStyle]}
          testID={PerpsWatchlistSelectorsIDs.EMPTY_STATE}
        >
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Default}
            style={styles.emptyStateTitle}
            testID={PerpsWatchlistSelectorsIDs.EMPTY_STATE_TITLE}
          >
            {strings('perps.watchlist.empty_title')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.emptyStateSubtitle}
            testID={PerpsWatchlistSelectorsIDs.EMPTY_STATE_SUBTITLE}
          >
            {strings('perps.watchlist.empty_subtitle')}
          </Text>

          {suggestedMarkets.map((market) => (
            <PerpsSuggestedMarketRow
              key={market.symbol}
              market={market}
              onPress={() => handleMarketPress(market)}
              onAddPress={() => addToWatchlist(market.symbol)}
            />
          ))}
        </View>
      </View>
    );
  }

  // Populated watchlist — apply expand/collapse when > INITIAL_DISPLAY_COUNT items
  const hasMore = markets.length > INITIAL_DISPLAY_COUNT;
  const displayedMarkets =
    hasMore && !expanded ? markets.slice(0, INITIAL_DISPLAY_COUNT) : markets;
  const hiddenCount = markets.length - INITIAL_DISPLAY_COUNT;

  const renderMarket = ({ item }: { item: PerpsMarketData }) => (
    <PerpsMarketRowItem
      market={item}
      showBadge={false}
      onPress={() => handleMarketPress(item)}
    />
  );

  return (
    <View
      style={[styles.section, sectionStyle]}
      testID={PerpsWatchlistSelectorsIDs.SECTION}
    >
      <SectionHeader />
      <View style={contentContainerStyle}>
        <FlatList
          data={displayedMarkets}
          renderItem={renderMarket}
          keyExtractor={(item) => item.symbol}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />

        {hasMore && (
          <TouchableOpacity
            style={styles.showMoreRow}
            onPress={() => setExpanded((prev) => !prev)}
            testID={
              expanded
                ? PerpsWatchlistSelectorsIDs.SHOW_LESS_BUTTON
                : PerpsWatchlistSelectorsIDs.SHOW_MORE_BUTTON
            }
            activeOpacity={0.7}
          >
            <Text variant={TextVariant.BodySMBold} color={TextColor.Primary}>
              {expanded
                ? strings('perps.watchlist.show_less')
                : strings('perps.watchlist.show_more', {
                    count: hiddenCount,
                  })}
            </Text>
            <Icon
              name={expanded ? IconName.ArrowUp : IconName.ArrowDown}
              size={IconSize.Xs}
              color={IconColor.Primary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default PerpsWatchlistMarkets;
