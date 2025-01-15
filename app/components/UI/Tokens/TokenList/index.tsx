import React, { useCallback, useMemo, useState } from 'react';
import { View, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FlashList } from '@shopify/flash-list';
import {
  useMetrics,
  MetaMetricsEvents,
} from '../../../../components/hooks/useMetrics';
import { useTheme } from '../../../../util/theme';
import { createDetectedTokensNavDetails } from '../../../Views/DetectedTokens';
import { selectChainId } from '../../../../selectors/networkController';
import { selectDetectedTokens } from '../../../../selectors/tokensController';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { getDecimalChainId } from '../../../../util/networks';
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

  return tokens?.length > 0 ? (
    <FlashList
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
      estimatedItemSize={tokens.length}
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
