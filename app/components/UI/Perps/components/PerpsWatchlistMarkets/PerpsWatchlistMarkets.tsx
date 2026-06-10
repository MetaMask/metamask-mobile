import React, { useCallback, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
  type Position,
  type Order,
} from '@metamask/perps-controller';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { usePerpsWatchlistActions } from '../../hooks/usePerpsWatchlistActions';
import { PerpsWatchlistSelectorsIDs } from '../../Perps.testIds';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsWatchlistMarkets.styles';
import {
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

/** Markets with ≤ this count are shown without a "Show more" toggle. */
const INITIAL_DISPLAY_COUNT = 3;

interface PerpsWatchlistMarketsProps {
  markets: PerpsMarketData[];
  /** Markets to offer as suggestions below the watchlist; omit to hide the section */
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
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {strings('perps.home.watchlist')}
          </Text>
          {onSeeAllPress && (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
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

  const hasWatchlist = markets.length > 0;
  const hasSuggested = (suggestedMarkets?.length ?? 0) > 0;

  if (!hasWatchlist && !hasSuggested) {
    return null;
  }

  // Expand/collapse applies only to the watchlist rows
  const hasMore = hasWatchlist && markets.length > INITIAL_DISPLAY_COUNT;
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
        {hasWatchlist && (
          <>
            <FlatList
              data={displayedMarkets}
              renderItem={renderMarket}
              keyExtractor={(item) => item.symbol}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />

            {hasMore && (
              <View style={styles.showMoreButtonContainer}>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  isFullWidth
                  onPress={() => setExpanded((prev) => !prev)}
                  testID={
                    expanded
                      ? PerpsWatchlistSelectorsIDs.SHOW_LESS_BUTTON
                      : PerpsWatchlistSelectorsIDs.SHOW_MORE_BUTTON
                  }
                  style={styles.showMoreButton}
                >
                  {expanded
                    ? strings('perps.watchlist.show_less')
                    : strings('perps.watchlist.show_more', {
                        count: hiddenCount,
                      })}
                </Button>
              </View>
            )}
          </>
        )}

        {hasSuggested && (
          <View
            style={styles.suggestedSection}
            testID={PerpsWatchlistSelectorsIDs.SUGGESTED_SECTION}
          >
            <Text
              variant={TextVariant.BodySm}
              color={
                hasWatchlist ? TextColor.TextAlternative : TextColor.TextDefault
              }
              style={styles.suggestedHeader}
              testID={PerpsWatchlistSelectorsIDs.SUGGESTED_HEADER}
            >
              {hasWatchlist
                ? strings('perps.watchlist.suggested')
                : strings('perps.watchlist.empty_subtitle')}
            </Text>
            {suggestedMarkets?.map((market) => (
              <PerpsMarketRowItem
                key={market.symbol}
                market={market}
                showBadge={false}
                onPress={() => handleMarketPress(market)}
                onAddPress={() => addToWatchlist(market.symbol)}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default PerpsWatchlistMarkets;
