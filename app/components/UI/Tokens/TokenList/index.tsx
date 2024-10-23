import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  useMetrics,
  MetaMetricsEvents,
} from '../../../../components/hooks/useMetrics';
import { useTheme } from '../../../../util/theme';
import { createDetectedTokensNavDetails } from '../../../Views/DetectedTokens';
import { selectDetectedTokens } from '../../../../selectors/tokensController';
import { getDecimalChainId } from '../../../../util/networks';
import createStyles from '../styles';
import Text from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../types';
import { strings } from '../../../../../locales/i18n';
import { TokenListFooter } from './TokenListFooter';
import { TokenListItem } from './TokenListItem';
import { useChainId } from '../../../../selectors/hooks';

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
  const { trackEvent } = useMetrics();

  const chainId = useChainId();
  const detectedTokens = useSelector(selectDetectedTokens);

  const [showScamWarningModal, setShowScamWarningModal] = useState(false);

  const styles = createStyles(colors);

  const showDetectedTokens = () => {
    navigation.navigate(...createDetectedTokensNavDetails());
    trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
      source: 'detected',
      chain_id: getDecimalChainId(chainId),
      tokens: detectedTokens?.map(
        (token) => `${token.symbol} - ${token.address}`,
      ),
    });
    setIsAddTokenEnabled(true);
  };

  return tokens?.length ? (
    <FlatList
      data={tokens}
      renderItem={({ item }) => (
        <TokenListItem
          asset={item}
          chainId={chainId}
          showRemoveMenu={showRemoveMenu}
          showScamWarningModal={showScamWarningModal}
          setShowScamWarningModal={setShowScamWarningModal}
        />
      )}
      keyExtractor={(_, index) => index.toString()}
      ListFooterComponent={
        <TokenListFooter
          tokens={tokens}
          goToAddToken={goToAddToken}
          showDetectedTokens={showDetectedTokens}
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
