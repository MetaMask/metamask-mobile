import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import createStyles from '../styles';
import Text from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../types';
import { strings } from '../../../../../locales/i18n';
import { TokenListFooter } from './TokenListFooter';
import { TokenListItem } from './TokenListItem';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';

interface TokenListProps {
  tokens: TokenI[];
  refreshing: boolean;
  isAddTokenEnabled: boolean;
  onRefresh: () => void;
  showRemoveMenu: (arg: TokenI) => void;
  goToAddToken: () => void;
}

export const TokenList = ({
  tokens,
  refreshing,
  isAddTokenEnabled,
  onRefresh,
  showRemoveMenu,
  goToAddToken,
}: TokenListProps) => {
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);

  const [showScamWarningModal, setShowScamWarningModal] = useState(false);

  const styles = createStyles(colors);

  return tokens?.length ? (
    <FlatList
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      data={tokens}
      renderItem={({ item }) => (
        <TokenListItem
          asset={item}
          showRemoveMenu={showRemoveMenu}
          showScamWarningModal={showScamWarningModal}
          setShowScamWarningModal={setShowScamWarningModal}
          privacyMode={privacyMode}
        />
      )}
      keyExtractor={(_, index) => index.toString()}
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
    />
  ) : (
    <View style={styles.emptyView}>
      <Text style={styles.text}>{strings('wallet.no_tokens')}</Text>
    </View>
  );
};
