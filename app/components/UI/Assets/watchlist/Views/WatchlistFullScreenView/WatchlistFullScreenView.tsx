import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import ReorderableList from 'react-native-reorderable-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTokenWatchlistQuery } from '../../hooks/useTokenWatchlistQuery';
import {
  useTokenWatchlistRemoveItemMutation,
  useTokenWatchlistUpdateListMutation,
} from '../../hooks/useTokenWatchlistMutations';
import useTrackWatchlistPageViewed from '../../hooks/useTrackWatchlistPageViewed';
import { WatchlistAnalytics } from '../../constants/watchlistAnalytics';
import { mapWatchlistTokenToTrendingAsset } from '../../../../../Views/Homepage/Sections/Watchlist/utils/mapWatchlistTokenToTrendingAsset';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEditableRow from './WatchlistEditableRow';
import WatchlistEmptyCTA from '../../components/WatchlistEmptyCTA';
import WatchlistSearchContent from './WatchlistSearchContent';
import { useWatchlistEditDraft } from './useWatchlistEditDraft';
import styleSheet from './WatchlistFullScreenView.styles';
import { useSelector } from 'react-redux';
import CapsuleGlass from '../../../../../../component-library/components-temp/CapsuleGlass';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import {
  selectTokenWatchlistEnabled,
  selectUnifiedWatchlistEnabled,
} from '../../../selectors/featureFlags';
import { selectPerpsEnabledFlag } from '../../../../Perps/selectors/featureFlags';
import WatchlistPerpsProvider from '../../../../Watchlist/WatchlistPerpsProvider';
import { useUnifiedWatchlist } from '../../../../Watchlist/hooks/useUnifiedWatchlist';
import type { UnifiedWatchlistItem } from '../../../../Watchlist/types';
import WatchlistTokenRowItem from '../../../../Watchlist/WatchlistTokenRowItem';
import WatchlistUnavailablePerpRow from '../../../../Watchlist/WatchlistUnavailablePerpRow';
import WatchlistErrorRow from '../../../../Watchlist/WatchlistErrorRow';
import PerpsMarketRowItem from '../../../../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import { usePerpsNavigation } from '../../../../Perps/hooks/usePerpsNavigation';
import { usePerpsWatchlistActions } from '../../../../Perps/hooks/usePerpsWatchlistActions';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import type { CaipAssetType } from '@metamask/utils';
import type { PerpsStreamManager } from '../../../../Perps/providers/PerpsStreamManager';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';

const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;

/** Header controls sit on the glass capsule; the default press fill would cover it. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

const rowExitAnimation = FadeOut.duration(ANIMATION_DURATION);
const rowLayoutAnimation = LinearTransition.duration(ANIMATION_DURATION);

interface WatchlistFullViewRouteParams {
  source?: string;
}

const LegacyWatchlistFullScreenView = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as WatchlistFullViewRouteParams | undefined;
  const { data, isLoading } = useTokenWatchlistQuery();
  const updateListMutation = useTokenWatchlistUpdateListMutation();
  const [isSearchMode, setIsSearchMode] = useState(false);

  const queryTokens = useMemo(
    () => (data ?? []).slice().reverse().map(mapWatchlistTokenToTrendingAsset),
    [data],
  );

  const {
    isEditMode,
    displayTokens,
    handleEditPress,
    handleDonePress,
    onRemoveFromDraft,
    handleReorder,
  } = useWatchlistEditDraft({ queryTokens, updateListMutation });

  const hasItems = displayTokens.length > 0;
  const tokenCount = data?.length ?? 0;
  const isEmpty = !isLoading && !hasItems;

  useTrackWatchlistPageViewed({
    tokenCount,
    isEmpty,
    isLoading,
    source: routeParams?.source ?? WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
  });

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleDismissSearch = useCallback(() => {
    setIsSearchMode(false);
  }, []);

  const handleSearchPress = useCallback(() => {
    setIsSearchMode(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: TrendingAsset; index: number }) => (
      <Animated.View
        exiting={isEditMode ? rowExitAnimation : undefined}
        layout={isEditMode ? rowLayoutAnimation : undefined}
      >
        <WatchlistEditableRow
          token={item}
          position={index}
          isEditMode={isEditMode}
          onRemoveFromDraft={onRemoveFromDraft}
        />
      </Animated.View>
    ),
    [isEditMode, onRemoveFromDraft],
  );

  const keyExtractor = useCallback((item: TrendingAsset) => item.assetId, []);

  const endAccessory = useMemo(() => {
    if (isSearchMode) {
      return null;
    }

    if (isEditMode) {
      const doneButton = (
        <ButtonBase
          size={ButtonBaseSize.Md}
          onPress={handleDonePress}
          testID={WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON}
          accessibilityLabel={strings('token_watchlist.done')}
          twClassName={isGlassHeader ? HEADER_ICON_BUTTON_CLASS : undefined}
        >
          {strings('token_watchlist.done')}
        </ButtonBase>
      );

      return isGlassHeader ? (
        <CapsuleGlass twClassName="shrink-0">{doneButton}</CapsuleGlass>
      ) : (
        doneButton
      );
    }

    const headerActions = (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <ButtonIcon
          iconProps={{ color: IconColor.IconDefault }}
          iconName={IconName.Search}
          size={ButtonIconSize.Md}
          onPress={handleSearchPress}
          testID={WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON}
          accessibilityLabel="Search"
          twClassName={HEADER_ICON_BUTTON_CLASS}
        />
        {hasItems ? (
          <ButtonIcon
            iconProps={{ color: IconColor.IconDefault }}
            iconName={IconName.Edit}
            size={ButtonIconSize.Md}
            onPress={handleEditPress}
            testID={WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON}
            accessibilityLabel={strings('token_watchlist.edit')}
            twClassName={HEADER_ICON_BUTTON_CLASS}
          />
        ) : null}
      </Box>
    );

    if (!isGlassHeader) {
      return headerActions;
    }

    return (
      <CapsuleGlass twClassName="shrink-0 px-2">{headerActions}</CapsuleGlass>
    );
  }, [
    isGlassHeader,
    handleDonePress,
    handleEditPress,
    handleSearchPress,
    hasItems,
    isEditMode,
    isSearchMode,
  ]);

  const listContent = useMemo(() => {
    if (isSearchMode) {
      return null;
    }

    if (isLoading) {
      return (
        <View style={styles.listContainer}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <TrendingTokensSkeleton
              key={`watchlist-fullscreen-skeleton-${i}`}
            />
          ))}
        </View>
      );
    }

    if (!hasItems) {
      return (
        <View style={styles.emptyContentContainer}>
          <WatchlistEmptyCTA source="watchlist_fullscreen_empty_cta" />
        </View>
      );
    }

    return (
      <ReorderableList
        data={displayTokens}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onReorder={handleReorder}
        dragEnabled={isEditMode}
        itemLayoutAnimation={isEditMode ? rowLayoutAnimation : undefined}
        style={[
          styles.listContainer,
          isEditMode && styles.listContainerEditMode,
        ]}
        showsVerticalScrollIndicator={false}
        testID={WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST}
      />
    );
  }, [
    displayTokens,
    handleReorder,
    hasItems,
    isEditMode,
    isLoading,
    isSearchMode,
    keyExtractor,
    renderItem,
    styles.emptyContentContainer,
    styles.listContainer,
    styles.listContainerEditMode,
  ]);

  return (
    <View
      style={styles.container}
      testID={WatchlistFullScreenViewSelectorsIDs.CONTAINER}
    >
      {!isSearchMode ? (
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          onBack={isEditMode ? undefined : handleBack}
          backButtonProps={
            isEditMode
              ? undefined
              : {
                  accessibilityLabel: 'Back',
                  testID: WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON,
                }
          }
          endAccessory={endAccessory}
          testID={WatchlistFullScreenViewSelectorsIDs.HEADER}
        />
      ) : null}

      {isSearchMode ? (
        <WatchlistSearchContent onDismiss={handleDismissSearch} />
      ) : (
        <>
          <View style={styles.titleContainer}>
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              testID={WatchlistFullScreenViewSelectorsIDs.TITLE}
            >
              {strings('token_watchlist.fullscreen_title')}
            </Text>
          </View>

          {listContent}
        </>
      )}
    </View>
  );
};

const MixedWatchlistFullScreenView = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as WatchlistFullViewRouteParams | undefined;
  const {
    items,
    tokens,
    perps,
    canUseLivePerpsPrices,
    canRefresh,
    isInitialLoading,
    refresh,
  } = useUnifiedWatchlist();
  const removeTokenMutation = useTokenWatchlistRemoveItemMutation();
  const { removeFromWatchlist: removePerpFromWatchlist } =
    usePerpsWatchlistActions(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST);
  const { navigateToMarketDetails } = usePerpsNavigation();
  const [isSearchMode, setIsSearchMode] = useState(false);
  const hasItems = items.length > 0;
  const hasError = Boolean(tokens.error || perps.error);
  const isEmpty = !isInitialLoading && !hasItems && !hasError;

  useTrackWatchlistPageViewed({
    tokenCount: tokens.items.length,
    isEmpty,
    isLoading: isInitialLoading,
    source: routeParams?.source ?? WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
  });

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handlePerpPress = useCallback(
    (market: PerpsMarketData) => {
      navigateToMarketDetails(
        market,
        PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
      );
    },
    [navigateToMarketDetails],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedWatchlistItem; index: number }) => {
      if (item.kind === 'token') {
        return (
          <WatchlistTokenRowItem
            token={item.token}
            position={index}
            isWatchlisted
            onWatchlistPress={() => {
              removeTokenMutation.mutate(item.assetId as CaipAssetType);
            }}
            tokenDetailsSource={TokenDetailsSource.WatchlistFullscreen}
          />
        );
      }

      if (item.status === 'unavailable') {
        return (
          <WatchlistUnavailablePerpRow
            item={item}
            onRemove={() => {
              removePerpFromWatchlist(item.symbol).catch(() => undefined);
            }}
            twClassName="py-2 min-h-0"
          />
        );
      }

      return (
        <PerpsMarketRowItem
          market={item.market}
          compact
          showBadge
          enableLivePrices={canUseLivePerpsPrices}
          isWatchlisted
          onWatchlistPress={() => {
            removePerpFromWatchlist(item.symbol).catch(() => undefined);
          }}
          onPress={handlePerpPress}
        />
      );
    },
    [
      canUseLivePerpsPrices,
      handlePerpPress,
      removePerpFromWatchlist,
      removeTokenMutation,
    ],
  );

  const endAccessory = useMemo(() => {
    if (isSearchMode) {
      return null;
    }

    const searchButton = (
      <ButtonIcon
        iconProps={{ color: IconColor.IconDefault }}
        iconName={IconName.Search}
        size={ButtonIconSize.Md}
        onPress={() => setIsSearchMode(true)}
        testID={WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON}
        accessibilityLabel={strings('wallet.search_accessibility_label')}
        twClassName={HEADER_ICON_BUTTON_CLASS}
      />
    );

    return isGlassHeader ? (
      <CapsuleGlass twClassName="shrink-0 px-2">{searchButton}</CapsuleGlass>
    ) : (
      searchButton
    );
  }, [isGlassHeader, isSearchMode]);

  const listContent = useMemo(() => {
    if (isInitialLoading && !hasItems) {
      return (
        <View style={styles.listContainer}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <TrendingTokensSkeleton
              key={`watchlist-fullscreen-skeleton-${index}`}
            />
          ))}
        </View>
      );
    }

    if (hasError && !hasItems) {
      return <WatchlistErrorRow onRetry={canRefresh ? refresh : undefined} />;
    }

    if (!hasItems) {
      return (
        <View style={styles.emptyContentContainer}>
          <WatchlistEmptyCTA source="watchlist_fullscreen_empty_cta" />
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {hasError ? (
          <WatchlistErrorRow onRetry={canRefresh ? refresh : undefined} />
        ) : null}
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          testID={WatchlistFullScreenViewSelectorsIDs.MIXED_LIST}
        />
      </View>
    );
  }, [
    canRefresh,
    hasError,
    hasItems,
    isInitialLoading,
    items,
    refresh,
    renderItem,
    styles.emptyContentContainer,
    styles.listContainer,
  ]);

  return (
    <View
      style={styles.container}
      testID={WatchlistFullScreenViewSelectorsIDs.CONTAINER}
    >
      {!isSearchMode ? (
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          onBack={handleBack}
          backButtonProps={{
            accessibilityLabel: strings('navigation.back'),
            testID: WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON,
          }}
          endAccessory={endAccessory}
          testID={WatchlistFullScreenViewSelectorsIDs.HEADER}
        />
      ) : null}

      {isSearchMode ? (
        <WatchlistSearchContent onDismiss={() => setIsSearchMode(false)} />
      ) : (
        <>
          <View style={styles.titleContainer}>
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              testID={WatchlistFullScreenViewSelectorsIDs.TITLE}
            >
              {strings('token_watchlist.fullscreen_title')}
            </Text>
          </View>
          {listContent}
        </>
      )}
    </View>
  );
};

interface WatchlistFullScreenViewProps {
  testStreamManager?: PerpsStreamManager;
}

const WatchlistFullScreenView = ({
  testStreamManager,
}: WatchlistFullScreenViewProps = {}) => {
  const isTokenWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const isUnifiedWatchlistEnabled = useSelector(selectUnifiedWatchlistEnabled);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  if (
    !isTokenWatchlistEnabled ||
    !isUnifiedWatchlistEnabled ||
    !isPerpsEnabled
  ) {
    return <LegacyWatchlistFullScreenView />;
  }

  return (
    <WatchlistPerpsProvider testStreamManager={testStreamManager}>
      <MixedWatchlistFullScreenView />
    </WatchlistPerpsProvider>
  );
};

export default WatchlistFullScreenView;
