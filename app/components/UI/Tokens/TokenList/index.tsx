import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { View, RefreshControl, Dimensions } from 'react-native';
import { BlankAreaEvent, FlashList } from '@shopify/flash-list';
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

interface TokenListProps {
  tokens: TokenI[];
  refreshing: boolean;
  isAddTokenEnabled: boolean;
  onRefresh: () => void;
  showRemoveMenu: (arg: TokenI) => void;
  goToAddToken: () => void;
  showPercentageChange?: boolean;
}

export const TokenList = ({
  tokens,
  refreshing,
  isAddTokenEnabled,
  onRefresh,
  showRemoveMenu,
  goToAddToken,
  showPercentageChange = true,
}: TokenListProps) => {
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );

  const listRef = useRef<FlashList<TokenI>>(null);

  const [showScamWarningModal, setShowScamWarningModal] = useState(false);

  const styles = createStyles(colors);
  const navigation = useNavigation();

  const { width: deviceWidth } = Dimensions.get('window');

  const itemHeight = 80; // Adjust this to match TokenListItem height

  const listLength = tokens.length;
  const estimatedListHeight = itemHeight * listLength;

  useLayoutEffect(() => {
    listRef.current?.recomputeViewableItems();
  }, [isTokenNetworkFilterEqualCurrentNetwork]);

  const handleLink = () => {
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.ONBOARDING.GENERAL_SETTINGS,
    });
  };

  const renderTokenListItem = useCallback(
    ({ item }: { item: TokenI }) => (
      <TokenListItem
        asset={item}
        showRemoveMenu={showRemoveMenu}
        showScamWarningModal={showScamWarningModal}
        setShowScamWarningModal={setShowScamWarningModal}
        privacyMode={privacyMode}
        showPercentageChange={showPercentageChange}
      />
    ),
    [
      showRemoveMenu,
      showScamWarningModal,
      setShowScamWarningModal,
      privacyMode,
      showPercentageChange,
    ],
  );

  return tokens?.length ? (
    <FlashList
      ref={listRef}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      data={tokens}
      estimatedItemSize={itemHeight}
      estimatedListSize={{ height: estimatedListHeight, width: deviceWidth }}
      removeClippedSubviews
      onBlankArea={(e: BlankAreaEvent) => {
        if (e.blankArea > 0.1) {
          console.warn(`Large blank area detected: ${e.blankArea}`);
        }
      }}
      viewabilityConfig={{
        waitForInteraction: true,
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 1000,
      }}
      renderItem={renderTokenListItem}
      keyExtractor={(item) => `${item.address}-${item.chainId}`}
      ListFooterComponent={
        <TokenListFooter
          tokens={tokens}
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
      extraData={{ isTokenNetworkFilterEqualCurrentNetwork, listLength }}
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
    </View> // TO see tokens without balance, Click here.
  );
};
