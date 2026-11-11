import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
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
import { useTokenWatchlistUpdateListMutation } from '../../hooks/useTokenWatchlistMutations';
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

const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;

/** Header controls sit on the glass capsule; the default press fill would cover it. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

const rowExitAnimation = FadeOut.duration(ANIMATION_DURATION);
const rowLayoutAnimation = LinearTransition.duration(ANIMATION_DURATION);

interface WatchlistFullViewRouteParams {
  source?: string;
}

const WatchlistFullScreenView = () => {
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

export default WatchlistFullScreenView;
