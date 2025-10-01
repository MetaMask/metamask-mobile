import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
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
import { ScrollSyncedVirtualizedList } from '../../../../component-library/components-temp/ScrollSyncedVirtualizedList';

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
  parentScrollY?: number;
  parentViewportHeight?: number;
}

const TokenListComponent = ({
  tokenKeys,
  refreshing: _refreshing,
  onRefresh: _onRefresh,
  showRemoveMenu,
  showPercentageChange = true,
  setShowScamWarningModal,
  parentScrollY = 0,
  parentViewportHeight = 0,
}: TokenListProps) => {
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);

  // BIP44 MAINTENANCE: Once stable, only use TokenListItemBip44
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const TokenListItemComponent = isMultichainAccountsState2Enabled
    ? TokenListItemBip44
    : TokenListItem;

  const styles = createStyles(colors);
  const navigation = useNavigation();

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
    <ScrollSyncedVirtualizedList
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      data={tokenKeys}
      renderItem={renderTokenListItem}
      itemHeight={64}
      parentScrollY={parentScrollY}
      _parentViewportHeight={parentViewportHeight}
      keyExtractor={(item) => {
        const staked = item.isStaked ? 'staked' : 'unstaked';
        return `${item.address}-${item.chainId}-${staked}`;
      }}
      ListFooterComponent={<TokenListFooter />}
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
