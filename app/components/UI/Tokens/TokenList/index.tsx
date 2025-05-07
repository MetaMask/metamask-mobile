import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { View, RefreshControl, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import {
  selectIsTokenNetworkFilterEqualCurrentNetwork,
  selectPrivacyMode,
} from '../../../../selectors/preferencesController';
import createStyles from '../styles';
import Text, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../types';
import { strings } from '../../../../../locales/i18n';
import { TokenListFooter } from './TokenListFooter';
import { TokenListItem } from './TokenListItem';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

export interface FlashListAssetKey {
  address: string;
  chainId: string | undefined;
  isStaked: boolean | undefined;
}

interface TokenListProps {
  tokenKeys: FlashListAssetKey[];
  refreshing: boolean;
  isAddTokenEnabled: boolean;
  onRefresh: () => void;
  showRemoveMenu: (arg: TokenI) => void;
  goToAddToken: () => void;
  showPercentageChange?: boolean;
  setShowScamWarningModal: () => void;
}

export const TokenList = ({
  tokenKeys,
  refreshing,
  isAddTokenEnabled,
  onRefresh,
  showRemoveMenu,
  goToAddToken,
  showPercentageChange = true,
  setShowScamWarningModal,
}: TokenListProps) => {
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );

  const listRef = useRef<FlashList<FlashListAssetKey>>(null);

  const styles = createStyles(colors);
  const navigation = useNavigation();

  const { width: deviceWidth } = Dimensions.get('window');

  const itemHeight = 70; // Adjust this to match TokenListItem height
  const numberOfItemsOnScreen = 6; // Adjust this to match number of items on screen

  const estimatedListHeight = itemHeight * numberOfItemsOnScreen;

  useLayoutEffect(() => {
    listRef.current?.recomputeViewableItems();
  }, [isTokenNetworkFilterEqualCurrentNetwork]);

  const handleLink = () => {
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.ONBOARDING.GENERAL_SETTINGS,
    });
  };

  const renderTokenListItem = useCallback(
    ({ item }: { item: FlashListAssetKey }) => (
      <TokenListItem
        assetKey={item}
        showRemoveMenu={showRemoveMenu}
        setShowScamWarningModal={setShowScamWarningModal}
        privacyMode={privacyMode}
        showPercentageChange={showPercentageChange}
      />
    ),
    [
      showRemoveMenu,
      setShowScamWarningModal,
      privacyMode,
      showPercentageChange,
    ],
  );

  return tokenKeys?.length ? (
    <FlashList
      ref={listRef}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      data={tokenKeys}
      estimatedItemSize={itemHeight}
      estimatedListSize={{ height: estimatedListHeight, width: deviceWidth }}
      removeClippedSubviews
      viewabilityConfig={{
        waitForInteraction: true,
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 1000,
      }}
      decelerationRate={0}
      disableAutoLayout
      renderItem={renderTokenListItem}
      keyExtractor={(item) => {
        const staked = item.isStaked ? 'staked' : 'unstaked';
        return `${item.address}-${item.chainId}-${staked}`;
      }}
      ListFooterComponent={
        <TokenListFooter
          goToAddToken={goToAddToken}
          isAddTokenEnabled={isAddTokenEnabled}
        />
      }
      refreshControl={
        <RefreshControl
          colors={[colors.primary.default]}
          tintColor={colors.icon.default}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
      extraData={{ isTokenNetworkFilterEqualCurrentNetwork }}
    />
  ) : (
    <View style={styles.emptyView}>
      <View style={styles.emptyTokensView}>
        <Text style={styles.emptyTokensViewText}>
          {strings('wallet.no_tokens')}
        </Text>
        <Text
          style={styles.emptyTokensViewText}
          color={TextColor.Info}
          onPress={handleLink}
        >
          {strings('wallet.show_tokens_without_balance')}
        </Text>
      </View>
    </View>
  );
};
