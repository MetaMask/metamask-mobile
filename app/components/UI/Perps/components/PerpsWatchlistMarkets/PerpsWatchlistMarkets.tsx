import React, { useCallback, useState } from 'react';
import { FlatList, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import {
  Box,
  SectionDivider,
  SectionHeader,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PERPS_EVENT_VALUE,
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
  type Position,
  type Order,
} from '@metamask/perps-controller';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { usePerpsWatchlistActions } from '../../hooks/usePerpsWatchlistActions';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsWatchlistSelectorsIDs } from '../../Perps.testIds';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsWatchlistMarkets.styles';
import { WATCHLIST_LIMIT } from '../../utils/marketUtils';
import { selectPerpsWatchlistMarkets } from '../../selectors/perpsController';
import { selectPerpsWatchlistEnabledFlag } from '../../selectors/featureFlags';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const ANIMATION_DURATION = 250;

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
  /** Sub-section of the parent screen that triggered navigation (e.g., 'watchlist'). */
  source_section?: string;
  /** Bound onto market-details routes for downstream transaction attribution. */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /** Override section styles (e.g., to adjust margins) */
  sectionStyle?: StyleProp<ViewStyle>;
  /** Override header styles (e.g., to remove horizontal padding) */
  headerStyle?: StyleProp<ViewStyle>;
  /** Override content container styles (e.g., to remove horizontal margin) */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Override the default internal navigation when a market row is pressed.
   * Use this when the parent screen owns navigation (e.g. PerpsMarketListView),
   * so that onMarketSelect and transactionActiveAbTests are handled correctly.
   * When omitted the component falls back to its own navigation.navigate call.
   */
  onMarketPress?: (market: PerpsMarketData) => void;
  /** Called when the "Watchlist >" header is pressed */
  onSeeAllPress?: () => void;
  /** Whether to render the "Watchlist" section header. Defaults to true. */
  showHeader?: boolean;
  /** Whether to render a divider above the section header. Defaults to true. */
  showLeadingDivider?: boolean;
  /** Whether to render the collapsible "Show more"/"Show less" toggle. Defaults to true. */
  enableShowMore?: boolean;
}

// ─── Legacy (flag OFF) ──────────────────────────────────────────────────────

/**
 * Pre-redesign watchlist: plain list, hidden when empty, no empty state /
 * suggested markets / show-more / chevron header.
 */
const PerpsWatchlistMarketsV1: React.FC<PerpsWatchlistMarketsProps> = ({
  markets,
  isLoading,
  positions = [],
  orders = [],
  source,
  source_section,
  transactionActiveAbTests,
  sectionStyle,
  contentContainerStyle,
  onMarketPress,
  showLeadingDivider = true,
}) => {
  const navigation = useNavigation<AppNavigationProp>();

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      if (onMarketPress) {
        onMarketPress(market);
        return;
      }

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
          ...(source_section && { source_section }),
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        },
      });
    },
    [
      onMarketPress,
      navigation,
      positions,
      orders,
      source,
      source_section,
      transactionActiveAbTests,
    ],
  );

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

  if (!isLoading && markets.length === 0) {
    return null;
  }

  return (
    <Box style={sectionStyle} testID={PerpsWatchlistSelectorsIDs.SECTION}>
      {showLeadingDivider ? <SectionDivider /> : null}
      <SectionHeader title={strings('perps.home.watchlist')} />
      <Box paddingHorizontal={4} style={contentContainerStyle}>
        {isLoading ? (
          <PerpsRowSkeleton count={3} />
        ) : (
          <FlatList
            data={markets}
            renderItem={renderMarket}
            keyExtractor={(item) => item.symbol}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        )}
      </Box>
    </Box>
  );
};

// ─── Redesigned (flag ON) ───────────────────────────────────────────────────

const PerpsWatchlistMarketsV2: React.FC<PerpsWatchlistMarketsProps> = ({
  markets,
  suggestedMarkets,
  isLoading,
  positions = [],
  orders = [],
  source,
  source_section,
  transactionActiveAbTests,
  sectionStyle,
  headerStyle,
  contentContainerStyle,
  onMarketPress,
  onSeeAllPress,
  showHeader = true,
  enableShowMore = true,
  showLeadingDivider = true,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const [expanded, setExpanded] = useState(false);
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);
  const { track } = usePerpsEventTracking();

  const { addToWatchlist } = usePerpsWatchlistActions(
    PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
  );

  const handleSeeAllPress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.WATCHLIST,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
    onSeeAllPress?.();
  }, [track, onSeeAllPress]);

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      if (onMarketPress) {
        onMarketPress(market);
        return;
      }

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
          ...(source_section && { source_section }),
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        },
      });
    },
    [
      onMarketPress,
      navigation,
      positions,
      orders,
      source,
      source_section,
      transactionActiveAbTests,
    ],
  );

  const watchlistHeader = showHeader ? (
    <>
      {showLeadingDivider ? <SectionDivider /> : null}
      <SectionHeader
        title={strings('perps.home.watchlist')}
        isInteractive={Boolean(onSeeAllPress)}
        onPress={handleSeeAllPress}
        testID={PerpsWatchlistSelectorsIDs.HEADER}
        style={headerStyle}
      />
    </>
  ) : null;

  if (isLoading) {
    return (
      <Box style={sectionStyle} testID={PerpsWatchlistSelectorsIDs.SECTION}>
        {watchlistHeader}
        <Box paddingHorizontal={4} style={contentContainerStyle}>
          <PerpsRowSkeleton count={3} />
        </Box>
      </Box>
    );
  }

  const hasWatchlist = markets.length > 0;
  const hasSuggested = (suggestedMarkets?.length ?? 0) > 0;
  // Use the Redux symbol count — not markets.length — so symbols that haven't
  // loaded yet still count toward the cap.
  const isWatchlistFull = watchlistSymbols.length >= WATCHLIST_LIMIT;

  if (!hasWatchlist && !hasSuggested) {
    return null;
  }

  // Expand/collapse applies only to the watchlist rows
  const hasMore =
    enableShowMore && hasWatchlist && markets.length > INITIAL_DISPLAY_COUNT;
  const displayedMarkets =
    hasMore && !expanded ? markets.slice(0, INITIAL_DISPLAY_COUNT) : markets;
  const hiddenCount = markets.length - INITIAL_DISPLAY_COUNT;

  const renderMarket = ({ item }: { item: PerpsMarketData }) => (
    <Animated.View
      key={item.symbol}
      entering={FadeIn.duration(ANIMATION_DURATION)}
      layout={LinearTransition.duration(ANIMATION_DURATION)}
    >
      <PerpsMarketRowItem
        market={item}
        showBadge={false}
        onPress={() => handleMarketPress(item)}
      />
    </Animated.View>
  );

  return (
    <Box style={sectionStyle} testID={PerpsWatchlistSelectorsIDs.SECTION}>
      {watchlistHeader}
      <Box paddingHorizontal={4} style={contentContainerStyle}>
        <Animated.View layout={LinearTransition.duration(ANIMATION_DURATION)}>
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

          {hasSuggested && !isWatchlistFull && (
            <Animated.View
              style={styles.suggestedSection}
              layout={LinearTransition.duration(ANIMATION_DURATION)}
              testID={PerpsWatchlistSelectorsIDs.SUGGESTED_SECTION}
            >
              <Text
                variant={TextVariant.BodySm}
                color={
                  hasWatchlist
                    ? TextColor.TextAlternative
                    : TextColor.TextDefault
                }
                style={styles.suggestedSubtitle}
                testID={PerpsWatchlistSelectorsIDs.SUGGESTED_HEADER}
              >
                {hasWatchlist
                  ? strings('perps.watchlist.suggested')
                  : strings('perps.watchlist.empty_subtitle')}
              </Text>
              {suggestedMarkets?.map((market) => (
                <Animated.View
                  key={market.symbol}
                  entering={FadeIn.duration(ANIMATION_DURATION)}
                  exiting={FadeOut.duration(ANIMATION_DURATION)}
                  layout={LinearTransition.duration(ANIMATION_DURATION)}
                >
                  <PerpsMarketRowItem
                    market={market}
                    showBadge={false}
                    onPress={() => handleMarketPress(market)}
                    onAddPress={() => addToWatchlist(market.symbol)}
                  />
                </Animated.View>
              ))}
            </Animated.View>
          )}
        </Animated.View>
      </Box>
    </Box>
  );
};

// ─── Public export ──────────────────────────────────────────────────────────

/**
 * Watchlist section for the Perps home screen.
 *
 * Reads the `perpsWatchlistEnabled` remote feature flag first.
 * When the flag is ON, renders the redesigned watchlist (empty state,
 * suggested markets, show-more/less, tappable header, animations, 10-asset
 * limit). When the flag is OFF, renders the pre-redesign plain list that
 * hides entirely when empty.
 */
const PerpsWatchlistMarkets: React.FC<PerpsWatchlistMarketsProps> = (props) => {
  const isWatchlistEnabled = useSelector(selectPerpsWatchlistEnabledFlag);

  if (isWatchlistEnabled) {
    return <PerpsWatchlistMarketsV2 {...props} />;
  }
  return <PerpsWatchlistMarketsV1 {...props} />;
};

export default PerpsWatchlistMarkets;
