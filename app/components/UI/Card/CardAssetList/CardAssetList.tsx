/* eslint-disable no-empty-function */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, View } from 'react-native';
import { useTheme } from '../../../../util/theme';
import createStyles from './styles';
import Loader from '../../../../component-library/components-temp/Loader';
import { fetchSupportedTokensBalances, TokenConfig } from '../card.utils';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import CardAssetListItem from './CardAssetListItem';
import { FlashList } from '@shopify/flash-list';
import { selectCardFeature } from '../../../../selectors/featureFlagController/card';

const CardAssetList = memo(() => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [refreshing, setRefreshing] = useState(false);
  const cardFeature = useSelector(selectCardFeature);
  const [supportedTokenBalances, setSupportedTokenBalances] = useState<{
    tokenConfigs: TokenConfig[];
    totalBalanceDisplay: string;
  } | null>(null);

  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { width: deviceWidth } = Dimensions.get('window');
  const itemHeight = 70; // Adjust this to match TokenListItem height
  const numberOfItemsOnScreen = 6; // Adjust this to match number of items on screen
  const estimatedListHeight = itemHeight * numberOfItemsOnScreen;

  const refreshTokens = useCallback(async () => {
    setRefreshing(true);

    if (!cardFeature) {
      throw new Error('Card feature is not enabled');
    }

    if (selectedAddress) {
      const { balanceList, totalBalanceDisplay } =
        await fetchSupportedTokensBalances(selectedAddress, cardFeature);

      setSupportedTokenBalances({
        tokenConfigs: balanceList,
        totalBalanceDisplay,
      });

      setRefreshing(false);
    }
  }, [selectedAddress, cardFeature]);

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(() => {
      refreshTokens();
    });
  }, [refreshTokens]);

  useEffect(() => {
    const fetchBalances = async () => {
      await refreshTokens();
    };

    fetchBalances();
  }, [refreshTokens]);

  const renderTokenItem = ({ item }: { item: TokenConfig }) => (
    <CardAssetListItem token={item} />
  );

  if (refreshing) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.loaderWrapper}>
          <Loader />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrapper}>
      <FlashList
        data={supportedTokenBalances?.tokenConfigs || []}
        estimatedItemSize={itemHeight}
        estimatedListSize={{
          height: estimatedListHeight,
          width: deviceWidth,
        }}
        removeClippedSubviews
        viewabilityConfig={{
          waitForInteraction: true,
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 1000,
        }}
        decelerationRate={0}
        disableAutoLayout
        renderItem={renderTokenItem}
        keyExtractor={(item) => item.address}
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
    </ScrollView>
  );
});

CardAssetList.displayName = 'CardAssetList';

export default CardAssetList;
