import React, { useCallback, useMemo } from 'react';
import { View, FlatList } from 'react-native';
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
import TrendingTokenRowItem from '../../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import styleSheet from './WatchlistFullScreenView.styles';
import type { TrendingAsset } from '@metamask/assets-controllers';

const SKELETON_COUNT = 5;

const WatchlistFullScreenView = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { data, isLoading } = useTokenWatchlistQuery();

  const displayTokens = useMemo(
    () => (data ?? []).slice().reverse().map(mapWatchlistTokenToTrendingAsset),
    [data],
  );

  const hasItems = displayTokens.length > 0;

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // TODO(ASSETS-XXXX): wire up search functionality in a follow-up ticket
  const handleSearchPress = useCallback(() => undefined, []);

  // TODO(ASSETS-XXXX): wire up edit functionality in a follow-up ticket
  const handleEditPress = useCallback(() => undefined, []);

  const endButtonIconProps = useMemo(() => {
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
  }, [hasItems, handleSearchPress, handleEditPress]);

  const renderItem = useCallback(
    ({ item, index }: { item: TrendingAsset; index: number }) => (
      <TrendingTokenRowItem
        token={item}
        position={index}
        tokenDetailsSource={TokenDetailsSource.WatchlistFullscreen}
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: TrendingAsset) => item.assetId, []);

  return (
    <View
      style={styles.container}
      testID={WatchlistFullScreenViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        onBack={handleBack}
        backButtonProps={{
          accessibilityLabel: 'Back',
          testID: WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON,
        }}
        endButtonIconProps={endButtonIconProps}
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
        <FlatList
          data={displayTokens}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          testID={WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST}
        />
      ) : null}
    </View>
  );
};

export default WatchlistFullScreenView;
