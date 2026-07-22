import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  ButtonSize,
  HeaderStandard,
  IconName,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTokenWatchlistQuery } from '../../hooks/useTokenWatchlistQuery';
import useTrackWatchlistPageViewed from '../../hooks/useTrackWatchlistPageViewed';
import { WatchlistAnalytics } from '../../constants/watchlistAnalytics';
import { mapWatchlistTokenToTrendingAsset } from '../../../../../Views/Homepage/Sections/Watchlist/utils/mapWatchlistTokenToTrendingAsset';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEditableRow from './WatchlistEditableRow';
import WatchlistEmptyCTA from '../../components/WatchlistEmptyCTA';
import WatchlistSearchContent from './WatchlistSearchContent';
import styleSheet from './WatchlistFullScreenView.styles';

const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;

export interface WatchlistFullViewRouteParams {
  source?: string;
}

const WatchlistFullScreenView = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params as WatchlistFullViewRouteParams | undefined;
  const { data, isLoading } = useTokenWatchlistQuery();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const displayTokens = useMemo(
    () => (data ?? []).slice().reverse().map(mapWatchlistTokenToTrendingAsset),
    [data],
  );

  const hasItems = displayTokens.length > 0;
  const tokenCount = data?.length ?? 0;
  const isEmpty = !isLoading && !hasItems;

  useTrackWatchlistPageViewed({
    tokenCount,
    isEmpty,
    isLoading,
    source: routeParams?.source ?? WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
  });

  useEffect(() => {
    if (isEditMode && !hasItems) {
      setIsEditMode(false);
    }
  }, [isEditMode, hasItems]);

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

  const handleEditPress = useCallback(() => setIsEditMode(true), []);
  const handleDonePress = useCallback(() => setIsEditMode(false), []);

  const endAccessory = useMemo(() => {
    if (isSearchMode) {
      return null;
    }

    if (isEditMode) {
      return (
        <TouchableOpacity
          onPress={handleDonePress}
          testID={WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON}
          accessibilityRole="button"
          accessibilityLabel={strings('token_watchlist.done')}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('token_watchlist.done')}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.headerEndActions}>
        <ButtonIcon
          iconName={IconName.Search}
          size={ButtonIconSize.Md}
          onPress={handleSearchPress}
          testID={WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON}
          accessibilityLabel="Search"
        />
        {hasItems ? (
          <TouchableOpacity
            onPress={handleEditPress}
            testID={WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON}
            accessibilityRole="button"
            accessibilityLabel={strings('token_watchlist.edit')}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('token_watchlist.edit')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [
    isSearchMode,
    isEditMode,
    hasItems,
    handleDonePress,
    handleEditPress,
    handleSearchPress,
    styles.headerEndActions,
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

    const rowExitAnimation = isEditMode
      ? FadeOut.duration(ANIMATION_DURATION)
      : undefined;
    const rowLayoutAnimation = isEditMode
      ? LinearTransition.duration(ANIMATION_DURATION)
      : undefined;

    return (
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        testID={WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST}
      >
        <Animated.View layout={rowLayoutAnimation}>
          {displayTokens.map((token, index) => (
            <Animated.View
              key={token.assetId}
              exiting={rowExitAnimation}
              layout={rowLayoutAnimation}
            >
              <WatchlistEditableRow
                token={token}
                position={index}
                isEditMode={isEditMode}
              />
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    );
  }, [
    displayTokens,
    hasItems,
    isEditMode,
    isLoading,
    isSearchMode,
    styles.emptyContentContainer,
    styles.listContainer,
  ]);

  return (
    <View
      style={styles.container}
      testID={WatchlistFullScreenViewSelectorsIDs.CONTAINER}
    >
      {!isSearchMode ? (
        <HeaderStandard
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

          <View style={styles.tabContainer}>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Sm}
              testID={WatchlistFullScreenViewSelectorsIDs.TOKENS_TAB}
            >
              {strings('token_watchlist.tokens_tab')}
            </Button>
          </View>

          {listContent}
        </>
      )}
    </View>
  );
};

export default WatchlistFullScreenView;
