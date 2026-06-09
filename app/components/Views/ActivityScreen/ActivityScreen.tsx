import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, ScrollView } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Theme,
  useTailwind,
  useTheme as useDesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonBaseSize,
  ButtonBase,
  HeaderStandardAnimated,
  IconColor,
  IconName,
  TabEmptyState,
  Text,
  TextColor,
  TextFieldSearch,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import { useSelector } from 'react-redux';
import { selectAddressHasTokenBalances } from '../../../selectors/tokenBalancesController';
import ActivityEmptyDarkIcon from '../../../images/activity-empty-dark.svg';
import ActivityEmptyLightIcon from '../../../images/activity-empty-light.svg';
import { ActivityScreenSelectorsIDs } from './ActivityScreen.testIds';
import ActivityTypeFilterSheet, {
  ACTIVITY_TYPE_FILTER_LABEL_KEY,
} from './components/ActivityTypeFilterSheet';
import { TrendingTokenNetworkBottomSheet } from '../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenNetworkBottomSheet';
import { TRENDING_NETWORKS_LIST } from '../../UI/Trending/utils/trendingNetworksList';
import { useRampNavigation } from '../../UI/Ramp/hooks/useRampNavigation';
import { useMoneyAccountDeposit } from '../../UI/Money/hooks/useMoneyAccount';
import type { CaipChainId } from '@metamask/utils';
import { ActivityEmptyStateAction, getActivityEmptyState } from './utils';
import { ActivityTypeFilter } from './types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorBoundary from '../ErrorBoundary';

const ActivityScreen = () => {
  const tw = useTailwind();
  const designSystemTheme = useDesignSystemTheme();
  const navigation = useNavigation();
  const { goToBuy } = useRampNavigation();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const ActivityEmptyIcon =
    designSystemTheme === Theme.Dark
      ? ActivityEmptyDarkIcon
      : ActivityEmptyLightIcon;

  const scrollY = useSharedValue(0);
  const titleSectionHeight = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleTitleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      titleSectionHeight.value = event.nativeEvent.layout.height;
    },
    [titleSectionHeight],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>(
    ActivityTypeFilter.All,
  );
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const [isNetworkSheetOpen, setIsNetworkSheetOpen] = useState(false);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleOpenTypeSheet = useCallback(() => {
    setIsTypeSheetOpen(true);
  }, []);

  const handleCloseTypeSheet = useCallback(() => {
    setIsTypeSheetOpen(false);
  }, []);

  const handleSelectTypeFilter = useCallback((filter: ActivityTypeFilter) => {
    setTypeFilter(filter);
  }, []);

  const isTypeFilterActive = typeFilter !== ActivityTypeFilter.All;
  const typeFilterLabel = isTypeFilterActive
    ? strings('activity_view.filter_types_selected', {
        label: strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[typeFilter]),
      })
    : strings('activity_view.filter_all_types');

  const isNetworkFilterActive =
    Array.isArray(networkFilter) && networkFilter.length > 0;
  const selectedNetworkName = isNetworkFilterActive
    ? TRENDING_NETWORKS_LIST.find((n) => n.caipChainId === networkFilter[0])
        ?.name
    : undefined;
  const networkFilterLabel =
    isNetworkFilterActive && selectedNetworkName
      ? strings('activity_view.filter_network_selected', {
          label: selectedNetworkName,
        })
      : strings('activity_view.filter_all_networks');

  const handleOpenNetworkSheet = useCallback(() => {
    setIsNetworkSheetOpen(true);
  }, []);

  const handleCloseNetworkSheet = useCallback(() => {
    setIsNetworkSheetOpen(false);
  }, []);

  const handleSelectNetwork = useCallback((chainIds: CaipChainId[] | null) => {
    setNetworkFilter(chainIds);
  }, []);

  const hasFunds = useSelector(selectAddressHasTokenBalances);

  const emptyState = getActivityEmptyState({ filter: typeFilter, hasFunds });

  const handleEmptyStateAction = useCallback(() => {
    switch (emptyState.action) {
      case ActivityEmptyStateAction.Swap:
        navigation.navigate(Routes.BRIDGE.ROOT, {
          screen: Routes.BRIDGE.BRIDGE_VIEW,
        });
        return;
      case ActivityEmptyStateAction.AddFunds:
        goToBuy();
        return;
      case ActivityEmptyStateAction.MakePrediction:
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_LIST,
        });
        return;
      case ActivityEmptyStateAction.BrowsePerpsMarkets:
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_LIST,
        });
        return;
      case ActivityEmptyStateAction.TransferToMoney:
        initiateDeposit().catch((error) => {
          Logger.error(error as Error, {
            message:
              '[ActivityScreen] Money deposit failed to initiate from empty state',
          });
        });
        return;
      case ActivityEmptyStateAction.OpenMetamaskCard:
        navigation.navigate(Routes.CARD.ROOT);
        return;
      default:
        return;
    }
  }, [emptyState.action, navigation, goToBuy, initiateDeposit]);

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(Routes.HOME_TABS);
  }, [navigation]);

  return (
    <ErrorBoundary view="ActivityScreen">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={ActivityScreenSelectorsIDs.SAFE_AREA_VIEW}
      >
        <Box twClassName="flex-1 bg-default">
          <HeaderStandardAnimated
            testID={ActivityScreenSelectorsIDs.HEADER}
            includesTopInset
            title={strings('activity_view.title')}
            scrollY={scrollY}
            titleSectionHeight={titleSectionHeight}
            onBack={handleBackPress}
            backButtonProps={{ testID: ActivityScreenSelectorsIDs.BACK_BUTTON }}
          />

          <Animated.ScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('flex-grow px-4 pb-8')}
          >
            <Box onLayout={handleTitleLayout} twClassName="pb-4">
              <Text variant={TextVariant.HeadingLg}>
                {strings('activity_view.title')}
              </Text>
            </Box>

            <Box twClassName="pb-4">
              {/* No functionality yet, just a placeholder for the search input */}
              <TextFieldSearch
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={strings('activity_view.search_placeholder')}
                onPressClearButton={handleClearSearch}
                testID={ActivityScreenSelectorsIDs.SEARCH_INPUT}
              />
            </Box>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw.style('flex-row gap-2 pb-4')}
            >
              <ButtonBase
                size={ButtonBaseSize.Md}
                startIconName={IconName.Filter}
                startIconProps={
                  isNetworkFilterActive
                    ? { color: IconColor.PrimaryDefault }
                    : undefined
                }
                textProps={
                  isNetworkFilterActive
                    ? { color: TextColor.PrimaryDefault }
                    : undefined
                }
                onPress={handleOpenNetworkSheet}
                testID={ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP}
              >
                {networkFilterLabel}
              </ButtonBase>
              <ButtonBase
                size={ButtonBaseSize.Md}
                startIconName={IconName.Customize}
                startIconProps={
                  isTypeFilterActive
                    ? { color: IconColor.PrimaryDefault }
                    : undefined
                }
                textProps={
                  isTypeFilterActive
                    ? { color: TextColor.PrimaryDefault }
                    : undefined
                }
                onPress={handleOpenTypeSheet}
                testID={ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP}
              >
                {typeFilterLabel}
              </ButtonBase>
            </ScrollView>

            {/* TODO: unified activity list (perps, predict, sends, swaps, bridges, non-EVM) */}
            <Box
              testID={ActivityScreenSelectorsIDs.LIST}
              twClassName="flex-1 items-center justify-center pb-32"
            >
              <TabEmptyState
                testID={ActivityScreenSelectorsIDs.EMPTY_STATE}
                icon={
                  <ActivityEmptyIcon
                    name="activity-empty"
                    width={72}
                    height={78}
                  />
                }
                description={strings(emptyState.descriptionKey)}
                actionButtonText={strings(emptyState.actionLabelKey)}
                onAction={handleEmptyStateAction}
              />
            </Box>
          </Animated.ScrollView>
        </Box>

        {isTypeSheetOpen ? (
          <ActivityTypeFilterSheet
            selected={typeFilter}
            onSelect={handleSelectTypeFilter}
            onClose={handleCloseTypeSheet}
          />
        ) : null}

        {/* This is a stub for the network filter bottom sheet. We may actually use this version depending on the feedback/requirements */}
        <TrendingTokenNetworkBottomSheet
          isVisible={isNetworkSheetOpen}
          onClose={handleCloseNetworkSheet}
          onNetworkSelect={handleSelectNetwork}
          selectedNetwork={networkFilter}
          networks={TRENDING_NETWORKS_LIST}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ActivityScreen;
