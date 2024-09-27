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
import { selectChainId } from '../../../../selectors/networkController';
import { selectDetectedTokens } from '../../../../selectors/tokensController';
import { getDecimalChainId } from '../../../../util/networks';
import createStyles from '../styles';
import Text from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../types';
import { strings } from '../../../../../locales/i18n';
import { Networth } from './Networth';
import { TokenListFooter } from './TokenListFooter';
import { TokenListItem } from './TokenListItem';

interface TokenListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokens: any[];
  refreshing: boolean;
  onRefresh: () => void;
  showRemoveMenu: (arg: TokenI) => void;
}

export const TokenList = ({
  tokens,
  refreshing,
  onRefresh,
  showRemoveMenu,
}: TokenListProps) => {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();

  const chainId = useSelector(selectChainId);
  const detectedTokens = useSelector(selectDetectedTokens);

  const [showScamWarningModal, setShowScamWarningModal] = useState(false);
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);

  const styles = createStyles(colors);

  const goToAddToken = () => {
    setIsAddTokenEnabled(false);
    navigation.push('AddAsset', { assetType: 'token' });
    trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
      source: 'manual',
      chain_id: getDecimalChainId(chainId),
    });
    setIsAddTokenEnabled(true);
  };

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
      ListHeaderComponent={<Networth />}
      data={tokens}
      renderItem={({ item }) => (
        <TokenListItem
          asset={item}
          showRemoveMenu={showRemoveMenu}
          showScamWarningModal={showScamWarningModal}
          setShowScamWarningModal={setShowScamWarningModal}
        />
      )}
      keyExtractor={(_, index) => index.toString()}
      ListFooterComponent={
        <TokenListFooter
          tokens={tokens}
          isAddTokenEnabled={isAddTokenEnabled}
          goToAddToken={goToAddToken}
          showDetectedTokens={showDetectedTokens}
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
