import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { View, RefreshControl } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import {
  selectIsTokenNetworkFilterEqualCurrentNetwork,
  selectPrivacyMode,
} from '../../../../selectors/preferencesController';
import createStyles from '../styles';
import TextComponent, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../types';
import { strings } from '../../../../../locales/i18n';
import { TokenListFooter } from './TokenListFooter';
import { TokenListItem, TokenListItemBip44 } from './TokenListItem';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';

export interface FlashListAssetKey {
  address: string;
  chainId: string | undefined;
  isStaked: boolean | undefined;
}

interface TokenListProps {
  tokenKeys: FlashListAssetKey[];
  refreshing: boolean;
  onRefresh: () => void;
  showRemoveMenu: (arg: TokenI) => void;
  showPercentageChange?: boolean;
  setShowScamWarningModal: () => void;
}

const TokenListComponent = ({
  tokenKeys,
  refreshing,
  onRefresh,
  showRemoveMenu,
  showPercentageChange = true,
  setShowScamWarningModal,
}: TokenListProps) => {
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );

  // BIP44 MAINTENANCE: Once stable, only use TokenListItemBip44
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const TokenListItemComponent = isMultichainAccountsState2Enabled
    ? TokenListItemBip44
    : TokenListItem;

  const listRef = useRef<FlashListRef<FlashListAssetKey>>(null);

  const styles = createStyles(colors);
  const navigation = useNavigation();

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
      <TokenListItemComponent
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
      TokenListItemComponent,
    ],
  );

  return tokenKeys?.length ? (
    <FlashList
      ref={listRef}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      data={tokenKeys}
      removeClippedSubviews
      viewabilityConfig={{
        waitForInteraction: true,
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 1000,
      }}
      decelerationRate={0}
      renderItem={renderTokenListItem}
      keyExtractor={(item) => {
        const staked = item.isStaked ? 'staked' : 'unstaked';
        return `${item.address}-${item.chainId}-${staked}`;
      }}
      ListFooterComponent={<TokenListFooter />}
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
        <TextComponent style={styles.emptyTokensViewText}>
          {strings('wallet.no_tokens')}
        </TextComponent>
        <TextComponent
          style={styles.emptyTokensViewText}
          color={TextColor.Info}
          onPress={handleLink}
        >
          {strings('wallet.show_tokens_without_balance')}
        </TextComponent>
      </View>
    </View>
  );
};

export const TokenList = React.memo(TokenListComponent);
TokenList.displayName = 'TokenList';
