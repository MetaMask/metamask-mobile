import React, { useCallback, useState } from 'react';
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
  setIsAddTokenEnabled: (arg: boolean) => void;
}

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

export const TokenList = ({
  tokens,
  refreshing,
  isAddTokenEnabled,
  onRefresh,
  showRemoveMenu,
  goToAddToken,
  setIsAddTokenEnabled,
}: TokenListProps) => {
  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();

  const chainId = useSelector(selectChainId);
  const detectedTokens = useSelector(selectDetectedTokens);
  const privacyMode = useSelector(selectPrivacyMode);

  const [showScamWarningModal, setShowScamWarningModal] = useState(false);

  const styles = createStyles(colors);

  const renderItem = useCallback(
    ({ item }) => (
      <TokenListItem
        asset={item}
        showRemoveMenu={showRemoveMenu}
        showScamWarningModal={showScamWarningModal}
        setShowScamWarningModal={setShowScamWarningModal}
        privacyMode={privacyMode}
      />
    ),
    [
      showScamWarningModal,
      privacyMode,
      showRemoveMenu,
      setShowScamWarningModal,
    ],
  );

  return tokens?.length > 0 ? (
    <FlashList
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      data={tokens}
      estimatedItemSize={50}
      renderItem={renderItem}
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
