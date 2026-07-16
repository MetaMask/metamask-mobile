import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
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
import { mapWatchlistTokenToTrendingAsset } from '../../../../../Views/Homepage/Sections/Watchlist/utils/mapWatchlistTokenToTrendingAsset';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEditableRow from './WatchlistEditableRow';
import styleSheet from './WatchlistFullScreenView.styles';
import type { TrendingAsset } from '@metamask/assets-controllers';

const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;

const WatchlistFullScreenView = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { data, isLoading } = useTokenWatchlistQuery();
  const [isEditMode, setIsEditMode] = useState(false);

  const displayTokens = useMemo(
    () => (data ?? []).slice().reverse().map(mapWatchlistTokenToTrendingAsset),
    [data],
  );

  const hasItems = displayTokens.length > 0;

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

  // TODO(ASSETS-XXXX): wire up search functionality in a follow-up ticket
  const handleSearchPress = useCallback(() => undefined, []);

  const handleEditPress = useCallback(() => setIsEditMode(true), []);
  const handleDonePress = useCallback(() => setIsEditMode(false), []);

  const endButtonIconProps = useMemo(() => {
    if (isEditMode) {
      return [];
    }

    const buttons = [];

    if (hasItems) {
      buttons.push({
        iconName: IconName.Edit,
        onPress: handleEditPress,
        accessibilityLabel: 'Edit',
        testID: WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON,
      });
    }

    buttons.push({
      iconName: IconName.Search,
      onPress: handleSearchPress,
      accessibilityLabel: 'Search',
      testID: WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON,
    });

    return buttons;
  }, [isEditMode, hasItems, handleSearchPress, handleEditPress]);

  const endAccessory = useMemo(() => {
    if (!isEditMode) {
      return undefined;
    }
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
  }, [isEditMode, handleDonePress]);

  return (
    <View
      style={styles.container}
      testID={WatchlistFullScreenViewSelectorsIDs.CONTAINER}
    >
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
        endButtonIconProps={endButtonIconProps}
        endAccessory={endAccessory}
        testID={WatchlistFullScreenViewSelectorsIDs.HEADER}
      />

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

      {isLoading ? (
        <View style={styles.listContainer}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <TrendingTokensSkeleton
              key={`watchlist-fullscreen-skeleton-${i}`}
            />
          ))}
        </View>
      ) : hasItems ? (
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          testID={WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST}
        >
          <Animated.View layout={LinearTransition.duration(ANIMATION_DURATION)}>
            {displayTokens.map((token, index) => (
              <Animated.View
                key={token.assetId}
                exiting={FadeOut.duration(ANIMATION_DURATION)}
                layout={LinearTransition.duration(ANIMATION_DURATION)}
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
      ) : null}
    </View>
  );
};

export default WatchlistFullScreenView;
