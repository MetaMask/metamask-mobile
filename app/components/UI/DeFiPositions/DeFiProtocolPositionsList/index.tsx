import React, { useMemo } from 'react';
import { View, FlatList } from 'react-native';
import { useTheme } from '../../../../util/theme';
import createStyles from '../styles';
import Text from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import DeFiProtocolPositionListItem from '../DeFiProtocolPositionListItem';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { useSelector } from 'react-redux';

interface DeFiProtocolPositionsListProps {
  defiPositions: { [key: Hex]: GroupedDeFiPositions } | null;
  //   refreshing: boolean;
  //   isAddTokenEnabled: boolean;
  //   onRefresh: () => void;
  //   showRemoveMenu: (arg: TokenI) => void;
  //   goToAddToken: () => void;
  //   showPercentageChange?: boolean;
  //   showNetworkBadge?: boolean;
}

export const DeFiProtocolPositionsList = ({
  defiPositions,
}: DeFiProtocolPositionsListProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const formattedDeFiPositions = useMemo(() => {
    if (!defiPositions) {
      return [];
    }

    return Object.entries(defiPositions)
      .map(([chainId, chainDeFiPositions]) =>
        Object.values(chainDeFiPositions.protocols).map((protocol) => ({
          chainId: toHex(chainId) as Hex,
          symbol: protocol.protocolDetails.name,
          ...protocol,
        })),
      )
      .flat()
      .sort((a, b) => b.aggregatedMarketValue - a.aggregatedMarketValue);
  }, [defiPositions]);

  if (formattedDeFiPositions.length === 0) {
    return (
      <View style={styles.emptyView}>
        <View style={styles.emptyTokensView}>
          <Text style={styles.emptyTokensViewText}>
            {/* TODO: Custom message needed */}
            {strings('wallet.no_tokens')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      data={formattedDeFiPositions}
      renderItem={({ item }) => (
        <DeFiProtocolPositionListItem
          protocolAggregate={item}
          privacyMode={privacyMode}
        />
      )}
      keyExtractor={(_, index) => index.toString()}
    />
  );
};
