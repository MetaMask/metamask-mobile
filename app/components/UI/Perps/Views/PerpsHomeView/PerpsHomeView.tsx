import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  usePerpsHomeData,
  usePerpsNavigation,
  usePerpsMeasurement,
} from '../../hooks';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import PerpsCard from '../../components/PerpsCard';
import PerpsWatchlistMarkets from '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets';
import PerpsMarketTypeSection from '../../components/PerpsMarketTypeSection';
import PerpsRecentActivityList from '../../components/PerpsRecentActivityList/PerpsRecentActivityList';
import PerpsHomeSection from '../../components/PerpsHomeSection';
import PerpsRowSkeleton from '../../components/PerpsRowSkeleton';
import PerpsHomeHeader from '../../components/PerpsHomeHeader';
import { LEARN_MORE_CONFIG, SUPPORT_CONFIG } from '../../constants/perpsConfig';
import type { PerpsNavigationParamList } from '../../types/navigation';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import styleSheet from './PerpsHomeView.styles';
import { TraceName } from '../../../../../util/trace';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsHomeViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const PerpsHomeView = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Use centralized navigation hook
  const perpsNavigation = usePerpsNavigation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Fetch all home screen data with search filtering
  const {
    positions,
    orders,
    watchlistMarkets,
    perpsMarkets, // Crypto markets (renamed from trendingMarkets)
    stocksMarkets,
    commoditiesMarkets,
    forexMarkets,
    recentActivity,
    sortBy,
    isLoading,
  } = usePerpsHomeData({
    searchQuery: isSearchVisible ? searchQuery : '',
  });

  // Determine if any data is loading for initial load tracking
  // Orders and activity load via WebSocket instantly, only track positions and markets
  const isAnyLoading = isLoading.positions || isLoading.markets;

  // Performance tracking: Measure screen load time until data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView, // Keep same trace name for consistency
    conditions: [!isAnyLoading],
  });

  // Track home screen viewed event
  const source =
    route.params?.source || PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON;
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [!isAnyLoading],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]: PerpsEventValues.SCREEN_TYPE.MARKETS,
      [PerpsEventProperties.SOURCE]: source,
    },
  });

  const handleSearchToggle = useCallback(() => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      // Clear search when hiding search bar
      setSearchQuery('');
    }
  }, [isSearchVisible]);

  const handleLearnMorePress = useCallback(() => {
    navigation.navigate(Routes.PERPS.TUTORIAL, {
      source: PerpsEventValues.SOURCE.HOMESCREEN_TAB,
    });
  }, [navigation]);

  const handleContactSupportPress = useCallback(() => {
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SUPPORT_CONFIG.URL,
        title: strings(SUPPORT_CONFIG.TITLE_KEY),
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
    );
  }, [navigation, trackEvent, createEventBuilder]);

  // Modal handlers - now using navigation to modal stack
  const handleCloseAllPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CLOSE_ALL_POSITIONS,
    });
  }, [navigation]);

  const handleCancelAllPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
    });
  }, [navigation]);

  // Back button handler - now uses navigation hook
  const handleBackPress = perpsNavigation.navigateBack;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Using extracted component */}
      <PerpsHomeHeader
        isSearchVisible={isSearchVisible}
        onBack={handleBackPress}
        onSearchToggle={handleSearchToggle}
        testID={PerpsHomeViewSelectorsIDs.BACK_BUTTON}
      />

      {/* Search Bar - Use design system component */}
      {isSearchVisible && (
        <View style={styles.searchContainer}>
          <TextFieldSearch
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            showClearButton={searchQuery.length > 0}
            onPressClearButton={() => setSearchQuery('')}
            placeholder={strings('perps.search_by_token_symbol')}
            testID={PerpsHomeViewSelectorsIDs.SEARCH_INPUT}
          />
        </View>
      )}

      {/* Main Content - ScrollView with all carousels */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Actions Component */}
        <PerpsMarketBalanceActions />

        {/* Positions Section */}
        <PerpsHomeSection
          title={strings('perps.home.positions')}
          isLoading={isLoading.positions}
          isEmpty={positions.length === 0}
          showWhenEmpty={false}
          actionLabel={strings('perps.home.close_all')}
          onActionPress={handleCloseAllPress}
          renderSkeleton={() => <PerpsRowSkeleton count={2} />}
        >
          <View style={styles.sectionContent}>
            {positions.map((position, index) => (
              <PerpsCard
                key={`${position.coin}-${index}`}
                position={position}
                source={PerpsEventValues.SOURCE.HOMESCREEN_TAB}
              />
            ))}
          </View>
        </PerpsHomeSection>

        {/* Orders Section */}
        <PerpsHomeSection
          title={strings('perps.home.orders')}
          isLoading={isLoading.orders}
          isEmpty={orders.length === 0}
          showWhenEmpty={false}
          actionLabel={strings('perps.home.cancel_all')}
          onActionPress={handleCancelAllPress}
          renderSkeleton={() => <PerpsRowSkeleton count={2} />}
        >
          <View style={styles.sectionContent}>
            {orders.map((order) => (
              <PerpsCard
                key={order.orderId}
                order={order}
                source={PerpsEventValues.SOURCE.HOMESCREEN_TAB}
              />
            ))}
          </View>
        </PerpsHomeSection>

        {/* Watchlist Section */}
        <PerpsWatchlistMarkets
          markets={watchlistMarkets}
          isLoading={isLoading.markets}
        />

        {/* Crypto Markets List */}
        <PerpsMarketTypeSection
          title={strings('perps.home.crypto')}
          markets={perpsMarkets}
          marketType="crypto"
          sortBy={sortBy}
          isLoading={isLoading.markets}
        />

        {/* Stocks Markets List */}
        <PerpsMarketTypeSection
          title={strings('perps.home.stocks')}
          markets={stocksMarkets}
          marketType="equity"
          isLoading={isLoading.markets}
        />

        {/* Commodities Markets List */}
        <PerpsMarketTypeSection
          title={strings('perps.home.commodities')}
          markets={commoditiesMarkets}
          marketType="commodity"
          isLoading={isLoading.markets}
        />

        {/* Forex Markets List */}
        <PerpsMarketTypeSection
          title={strings('perps.home.forex')}
          markets={forexMarkets}
          marketType="forex"
          isLoading={isLoading.markets}
        />

        {/* Recent Activity List */}
        <PerpsRecentActivityList
          fills={recentActivity}
          isLoading={isLoading.activity}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Learn about perps */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLearnMorePress}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonTextContainer}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {strings(LEARN_MORE_CONFIG.TITLE_KEY)}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings(LEARN_MORE_CONFIG.DESCRIPTION_KEY)}
                </Text>
              </View>
              <Icon
                name={IconName.Arrow2Right}
                size={IconSize.Md}
                color={theme.colors.icon.default}
              />
            </View>
          </TouchableOpacity>

          {/* Contact support */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleContactSupportPress}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonTextContainer}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {strings(SUPPORT_CONFIG.TITLE_KEY)}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings(SUPPORT_CONFIG.DESCRIPTION_KEY)}
                </Text>
              </View>
              <Icon
                name={IconName.Arrow2Right}
                size={IconSize.Md}
                color={theme.colors.icon.default}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsHomeView;
