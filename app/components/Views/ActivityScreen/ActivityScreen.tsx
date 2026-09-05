import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, ScrollView, TouchableOpacity } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandardAnimated,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { ActivityScreenSelectorsIDs } from './ActivityScreen.testIds';
import {
  ACTIVITY_TYPE_FILTER_LABEL_KEY,
  createActivityTypeFilterNavDetails,
} from './components/ActivityTypeFilterSheet';
import {
  PERPS_ACTIVITY_FILTER_LABEL_KEY,
  createPerpsActivityFilterNavDetails,
} from './components/PerpsActivityFilterSheet';
import { createActivityNetworkFilterNavDetails } from './components/ActivityNetworkFilterSheet';
import AssetListControlBar from './components/AssetListControlBar';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import ActivityList, { type ActivityListHandle } from '../ActivityList';
import ErrorBoundary from '../ErrorBoundary';
/* eslint-enable import-x/no-restricted-paths */
import type { CaipChainId } from '@metamask/utils';
import {
  ActivityTypeFilter,
  PerpsActivityFilter,
  getPerpsSubFilterKinds,
  resolveInitialActivityTypeFilter,
  type ActivityScreenParams,
} from './types';
import { useNetworkFilterOptions } from './hooks/useNetworkFilterOptions';
import {
  navigateWithDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import { useTrackFilterClicked } from '../../hooks/useTrackFilterClicked';
import {
  ALL_NETWORKS_FILTER_VALUE,
  FilterLocation,
  FilterType,
} from '../../../core/Analytics/events/filters';
import type { OrderItem } from '../../../util/orders/types';
import { useOrdersStore } from '../../../util/orders/ordersStore';
import { OrderListItemRow } from '../../UI/Orders/OrderListItemRow/OrderListItemRow';

const ActivityScreen = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  const scrollY = useSharedValue(0);
  const titleSectionHeight = useSharedValue(0);

  const handleTitleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      titleSectionHeight.value = event.nativeEvent.layout.height;
    },
    [titleSectionHeight],
  );

  const params = useParams<ActivityScreenParams>();
  const {
    initialTypeFilter: initialTypeFilterParam,
    redirectToPerpsTransactions: redirectToPerpsParam,
    redirectToOrders: redirectToOrdersParam,
    initialPerpsFilter: initialPerpsFilterParam,
    entryPoint,
  } = params;
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>(() =>
    resolveInitialActivityTypeFilter(params),
  );
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const [perpsFilter, setPerpsFilter] = useState<PerpsActivityFilter>(
    () => initialPerpsFilterParam ?? PerpsActivityFilter.Trades,
  );
  const [swapsFilter, setSwapsFilter] = useState<'open' | 'closed'>('open');

  const { orders } = useOrdersStore();

  const openOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.status === 'open' || o.status === 'partiallyFilled',
      ),
    [orders],
  );

  const closedOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === 'filled' ||
          o.status === 'cancelled' ||
          o.status === 'rejected' ||
          o.status === 'expired',
      ),
    [orders],
  );

  const currentSwapsOrders = swapsFilter === 'open' ? openOrders : closedOrders;

  const handleOrderPress = useCallback(
    (order: OrderItem) => {
      navigation.navigate(Routes.ORDER_DETAILS_VIEW, {
        orderId: order.id,
        order,
      });
    },
    [navigation],
  );

  const networkOptions = useNetworkFilterOptions();
  const trackFilterClicked = useTrackFilterClicked();

  const handleSelectTypeFilter = useCallback((filter: ActivityTypeFilter) => {
    setTypeFilter(filter);
    if (filter !== ActivityTypeFilter.Perps) {
      setPerpsFilter(PerpsActivityFilter.Trades);
    }
  }, []);

  useEffect(() => {
    if (
      initialTypeFilterParam === undefined &&
      !redirectToPerpsParam &&
      !redirectToOrdersParam &&
      initialPerpsFilterParam === undefined
    ) {
      return;
    }
    const resolvedTypeFilter = resolveInitialActivityTypeFilter({
      initialTypeFilter: initialTypeFilterParam,
      redirectToPerpsTransactions: redirectToPerpsParam,
      redirectToOrders: redirectToOrdersParam,
    });
    handleSelectTypeFilter(resolvedTypeFilter);
    if (resolvedTypeFilter === ActivityTypeFilter.Perps) {
      setPerpsFilter(initialPerpsFilterParam ?? PerpsActivityFilter.Trades);
    }
    navigation.setParams({
      initialTypeFilter: undefined,
      redirectToPerpsTransactions: undefined,
      redirectToOrders: undefined,
      initialPerpsFilter: undefined,
    });
  }, [
    initialTypeFilterParam,
    redirectToPerpsParam,
    redirectToOrdersParam,
    initialPerpsFilterParam,
    handleSelectTypeFilter,
    navigation,
  ]);

  const typeFilterLabel = strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[typeFilter]);

  const showPerpsFilter = typeFilter === ActivityTypeFilter.Perps;
  const showNetworkFilter =
    typeFilter !== ActivityTypeFilter.Perps &&
    typeFilter !== ActivityTypeFilter.Predictions &&
    typeFilter !== ActivityTypeFilter.Swaps;

  const effectiveNetworkFilter = useMemo<CaipChainId[] | null>(
    () => (showNetworkFilter ? networkFilter : null),
    [showNetworkFilter, networkFilter],
  );

  const isNetworkFilterActive =
    Array.isArray(effectiveNetworkFilter) && effectiveNetworkFilter.length > 0;
  const selectedNetworkName = isNetworkFilterActive
    ? networkOptions.find((n) => n.caipChainId === effectiveNetworkFilter[0])
        ?.name
    : undefined;
  const networkFilterLabel =
    isNetworkFilterActive && selectedNetworkName
      ? selectedNetworkName
      : strings('activity_view.filter_all_networks');

  const perpsFilterLabel = strings(
    PERPS_ACTIVITY_FILTER_LABEL_KEY[perpsFilter],
  );

  const handleSelectNetwork = useCallback(
    (chainIds: CaipChainId[] | null) => {
      trackFilterClicked({
        location: FilterLocation.Activity,
        filter_type: FilterType.Network,
        from_network: networkFilter?.[0] ?? ALL_NETWORKS_FILTER_VALUE,
        to_network: chainIds?.[0] ?? ALL_NETWORKS_FILTER_VALUE,
      });

      setNetworkFilter(chainIds);
    },
    [networkFilter, trackFilterClicked],
  );

  const handleSelectPerpsFilter = useCallback((filter: PerpsActivityFilter) => {
    setPerpsFilter(filter);
  }, []);

  const handleOpenTypeSheet = useCallback(() => {
    navigateWithDetails(
      navigation,
      createActivityTypeFilterNavDetails({
        selected: typeFilter,
        onSelect: handleSelectTypeFilter,
      }),
    );
  }, [navigation, typeFilter, handleSelectTypeFilter]);

  const handleOpenNetworkSheet = useCallback(() => {
    navigateWithDetails(
      navigation,
      createActivityNetworkFilterNavDetails({
        selectedNetwork: networkFilter,
        onNetworkSelect: handleSelectNetwork,
      }),
    );
  }, [navigation, networkFilter, handleSelectNetwork]);

  const handleOpenPerpsSheet = useCallback(() => {
    navigateWithDetails(
      navigation,
      createPerpsActivityFilterNavDetails({
        selected: perpsFilter,
        onSelect: handleSelectPerpsFilter,
      }),
    );
  }, [navigation, perpsFilter, handleSelectPerpsFilter]);

  const typeChip = useMemo(
    () => ({
      label: typeFilterLabel,
      onPress: handleOpenTypeSheet,
      testID: ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP,
    }),
    [typeFilterLabel, handleOpenTypeSheet],
  );

  const secondaryChip = useMemo(() => {
    if (showPerpsFilter) {
      return {
        label: perpsFilterLabel,
        onPress: handleOpenPerpsSheet,
        testID: ActivityScreenSelectorsIDs.PERPS_FILTER_CHIP,
      };
    }
    if (showNetworkFilter) {
      return {
        label: networkFilterLabel,
        onPress: handleOpenNetworkSheet,
        testID: ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP,
      };
    }
    return null;
  }, [
    showPerpsFilter,
    showNetworkFilter,
    perpsFilterLabel,
    networkFilterLabel,
    handleOpenPerpsSheet,
    handleOpenNetworkSheet,
  ]);

  const extraPills = useMemo(() => {
    if (typeFilter !== ActivityTypeFilter.Swaps) {
      return null;
    }

    return (
      <Box twClassName="flex-row items-center gap-2">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSwapsFilter('open')}
          testID="activity-swaps-filter-open"
          style={tw.style(
            `px-3 py-1.5 rounded-full border ${
              swapsFilter === 'open'
                ? 'bg-primary-muted border-primary-default'
                : 'bg-default border-muted'
            }`,
          )}
        >
          <Text
            variant={TextVariant.BodySmMedium}
            fontWeight={
              swapsFilter === 'open' ? FontWeight.Bold : FontWeight.Regular
            }
            color={
              swapsFilter === 'open'
                ? TextColor.PrimaryDefault
                : TextColor.TextAlternative
            }
          >
            Open ({openOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSwapsFilter('closed')}
          testID="activity-swaps-filter-closed"
          style={tw.style(
            `px-3 py-1.5 rounded-full border ${
              swapsFilter === 'closed'
                ? 'bg-primary-muted border-primary-default'
                : 'bg-default border-muted'
            }`,
          )}
        >
          <Text
            variant={TextVariant.BodySmMedium}
            fontWeight={
              swapsFilter === 'closed' ? FontWeight.Bold : FontWeight.Regular
            }
            color={
              swapsFilter === 'closed'
                ? TextColor.PrimaryDefault
                : TextColor.TextAlternative
            }
          >
            Closed ({closedOrders.length})
          </Text>
        </TouchableOpacity>
      </Box>
    );
  }, [typeFilter, swapsFilter, openOrders.length, closedOrders.length, tw]);

  const subFilterKinds = showPerpsFilter
    ? getPerpsSubFilterKinds(perpsFilter)
    : undefined;

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(Routes.HOME_TABS);
  }, [navigation]);

  const activityListRef = useRef<ActivityListHandle>(null);

  const handleHeaderTitlePress = useCallback(() => {
    activityListRef.current?.scrollToTop();
  }, []);

  const [isFilterBarPinned, setIsFilterBarPinned] = useState(false);

  useAnimatedReaction(
    () =>
      titleSectionHeight.value > 0 && scrollY.value >= titleSectionHeight.value,
    (pinned, previous) => {
      if (pinned !== previous) {
        runOnJS(setIsFilterBarPinned)(pinned);
      }
    },
  );

  const activityListHeader = useMemo(
    () => (
      <Box>
        <Box twClassName="px-4" onLayout={handleTitleLayout}>
          <Box twClassName="pb-4">
            <Text variant={TextVariant.HeadingLg}>
              {strings('activity_view.title')}
            </Text>
          </Box>
        </Box>

        <AssetListControlBar
          typeChip={typeChip}
          secondaryChip={secondaryChip}
          extraPills={extraPills}
        />
      </Box>
    ),
    [handleTitleLayout, typeChip, secondaryChip, extraPills],
  );

  return (
    <ErrorBoundary navigation={navigation} view="ActivityScreen">
      <SafeAreaView
        edges={[]}
        style={tw.style('flex-1 bg-default')}
        testID={ActivityScreenSelectorsIDs.SAFE_AREA_VIEW}
      >
        <Box twClassName="flex-1 bg-default">
          <HeaderStandardAnimated
            testID={ActivityScreenSelectorsIDs.HEADER}
            includesTopInset
            title={strings('activity_view.title')}
            titleProps={{
              onPress: handleHeaderTitlePress,
              suppressHighlighting: true,
              accessibilityRole: 'button',
            }}
            scrollY={scrollY}
            titleSectionHeight={titleSectionHeight}
            onBack={handleBackPress}
            backButtonProps={{ testID: ActivityScreenSelectorsIDs.BACK_BUTTON }}
          />

          <Box twClassName="flex-1">
            {typeFilter === ActivityTypeFilter.Swaps ? (
              <ScrollView
                style={tw.style('flex-1')}
                contentContainerStyle={tw.style('pb-12')}
                showsVerticalScrollIndicator={false}
              >
                {activityListHeader}
                <Box paddingHorizontal={4} gap={2}>
                  {currentSwapsOrders.length === 0 ? (
                    <Box twClassName="py-12 items-center justify-center">
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.TextAlternative}
                      >
                        {swapsFilter === 'open'
                          ? 'No open swap orders found.'
                          : 'No closed swap orders found.'}
                      </Text>
                    </Box>
                  ) : (
                    currentSwapsOrders.map((order) => (
                      <OrderListItemRow
                        key={order.id}
                        order={order}
                        onPress={handleOrderPress}
                      />
                    ))
                  )}
                </Box>
              </ScrollView>
            ) : (
              <ActivityList
                ref={activityListRef}
                header={activityListHeader}
                scrollY={scrollY}
                typeFilter={typeFilter}
                networkFilter={effectiveNetworkFilter}
                subFilterKinds={subFilterKinds}
                trackScreenViewed
                entryPoint={entryPoint}
              />
            )}

            {isFilterBarPinned ? (
              <Box twClassName="absolute top-0 left-0 right-0 bg-default">
                <AssetListControlBar
                  typeChip={typeChip}
                  secondaryChip={secondaryChip}
                  extraPills={extraPills}
                  suppressTestIDs
                />
              </Box>
            ) : null}
          </Box>
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ActivityScreen;
