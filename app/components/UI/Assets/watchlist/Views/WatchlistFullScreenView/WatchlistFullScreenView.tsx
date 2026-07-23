import React, { useCallback, useMemo, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import ReorderableList from 'react-native-reorderable-list';
import { useNavigation } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
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
import { useTokenWatchlistUpdateListMutation } from '../../hooks/useTokenWatchlistMutations';
import { mapWatchlistTokenToTrendingAsset } from '../../../../../Views/Homepage/Sections/Watchlist/utils/mapWatchlistTokenToTrendingAsset';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEditableRow from './WatchlistEditableRow';
import WatchlistEmptyCTA from '../../components/WatchlistEmptyCTA';
import WatchlistSearchContent from './WatchlistSearchContent';
import { useWatchlistEditDraft } from './useWatchlistEditDraft';
import styleSheet from './WatchlistFullScreenView.styles';

const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;

const rowExitAnimation = FadeOut.duration(ANIMATION_DURATION);
const rowLayoutAnimation = LinearTransition.duration(ANIMATION_DURATION);

const WatchlistFullScreenView = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
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
    handleDonePress,
    handleEditPress,
    handleSearchPress,
    hasItems,
    isEditMode,
    isSearchMode,
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

    return (
      <ReorderableList
        data={displayTokens}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onReorder={handleReorder}
        dragEnabled={isEditMode}
        itemLayoutAnimation={isEditMode ? rowLayoutAnimation : undefined}
        style={styles.listContainer}
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
