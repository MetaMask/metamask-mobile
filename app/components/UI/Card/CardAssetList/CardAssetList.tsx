/* eslint-disable no-empty-function */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, View } from 'react-native';
import { useTheme } from '../../../../util/theme';
import createStyles from './styles';
import Loader from '../../../../component-library/components-temp/Loader';
import {
  fetchSupportedTokensBalances,
  TokenConfig,
} from '../../Tokens/TokenList/PortfolioBalance/card.utils';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import CardAssetListItem from './CardAssetListItem';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { FlashListAssetKey, TokenList } from '../../Tokens/TokenList';
import { FlashList } from '@shopify/flash-list';

const CardAssetList = memo(() => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [refreshing, setRefreshing] = useState(false);
  const [supportedTokenBalances, setSupportedTokenBalances] = useState<{
    tokenKeys: FlashListAssetKey[];
    rawTokenConfigs: TokenConfig[];
    totalBalanceDisplay: string;
  } | null>(null);

  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { width: deviceWidth } = Dimensions.get('window');
  const itemHeight = 70; // Adjust this to match TokenListItem height
  const numberOfItemsOnScreen = 6; // Adjust this to match number of items on screen
  const estimatedListHeight = itemHeight * numberOfItemsOnScreen;

  // TEST VARIABLES
  const useFakeAddress = false; // Set to true to use a fake address for testing
  const fakeAddress = '0xFe4F94B62C04627C2677bF46FB249321594d0d79'; // Example fake address
  const filterZeroBalanceTokens = false; // Set to true to filter out tokens with zero balance
  const useNativeTokenList = false; // Set to true to use native token list (same as tokens tab)

  const refreshTokens = useCallback(async () => {
    setRefreshing(true);
    const address = useFakeAddress ? fakeAddress : selectedAddress;

    if (address) {
      const { balanceList, totalBalanceDisplay } =
        await fetchSupportedTokensBalances(address);

      const tokenKeys = balanceList.map((token) => ({
        address: token.address,
        chainId: LINEA_CHAIN_ID, // Assuming LINEA_CHAIN_ID for all tokens
        isStaked: false, // Assuming no staking for card balance
      }));
      setSupportedTokenBalances({
        tokenKeys,
        totalBalanceDisplay,
        rawTokenConfigs: filterZeroBalanceTokens
          ? balanceList.filter(
              (token) => token.balance !== '0' && token.address !== '',
            )
          : balanceList,
      });
      setRefreshing(false);
    }
  }, [selectedAddress, useFakeAddress, filterZeroBalanceTokens]);

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
      {useNativeTokenList ? (
        <TokenList
          tokenKeys={supportedTokenBalances?.tokenKeys || []}
          refreshing={refreshing}
          isAddTokenEnabled={false}
          onRefresh={onRefresh}
          showPercentageChange={false}
          showRemoveMenu={() => {}}
          goToAddToken={() => {}}
          setShowScamWarningModal={() => {}}
        />
      ) : (
        <FlashList
          data={supportedTokenBalances?.rawTokenConfigs || []}
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
      )}
    </ScrollView>
  );
});

CardAssetList.displayName = 'CardAssetList';

export default CardAssetList;
