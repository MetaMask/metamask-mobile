import React, { useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useTheme } from '../../../util/theme';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectIsAllNetworks,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { selectDeFiPositionsByAddress } from '../../../selectors/defiPositionsController';
import styleSheet from './DeFiPositionsList.styles';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import {
  selectPrivacyMode,
  selectTokenSortConfig,
} from '../../../selectors/preferencesController';
import { toHex } from '@metamask/controller-utils';
import { sortAssets } from '../Tokens/util';
import DeFiPositionsListItem from './DeFiPositionsListItem';
import DeFiPositionsControlBar from './DeFiPositionsControlBar';

export interface DeFiPositionsTabProps {
  tabLabel: string;
}

const DeFiPositionsTab: React.FC<DeFiPositionsTabProps> = () => {
  const theme = useTheme();
  const styles = styleSheet({ theme });

  const isAllNetworks = useSelector(selectIsAllNetworks);
  const currentChainId = useSelector(selectChainId) as Hex;
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const defiPositions = useSelector(selectDeFiPositionsByAddress);
  const privacyMode = useSelector(selectPrivacyMode);

  const formattedDeFiPositions = useMemo(() => {
    if (!defiPositions) {
      return defiPositions;
    }

    let chainFilteredDeFiPositions: { [key: Hex]: GroupedDeFiPositions };
    if (isAllNetworks) {
      chainFilteredDeFiPositions = defiPositions;
    } else if (currentChainId in defiPositions) {
      chainFilteredDeFiPositions = {
        [currentChainId]: defiPositions[currentChainId],
      };
    } else {
      return [];
    }

    if (!chainFilteredDeFiPositions) {
      return [];
    }

    const defiPositionsList = Object.entries(chainFilteredDeFiPositions)
      .map(([chainId, chainDeFiPositions]) =>
        Object.values(chainDeFiPositions.protocols).map(
          (protocolAggregate) => ({
            chainId: toHex(chainId),
            protocolAggregate,
          }),
        ),
      )
      .flat();

    const defiSortConfig = {
      ...tokenSortConfig,
      key:
        tokenSortConfig.key === 'tokenFiatAmount'
          ? 'protocolAggregate.aggregatedMarketValue'
          : 'protocolAggregate.protocolDetails.name',
    };

    return sortAssets(defiPositionsList, defiSortConfig);
  }, [defiPositions, isAllNetworks, currentChainId, tokenSortConfig]);

  if (!formattedDeFiPositions || formattedDeFiPositions.length === 0) {
    return (
      <View style={styles.emptyView}>
        <Text style={styles.emptyViewText}>
          {strings(
            !formattedDeFiPositions
              ? 'defi_positions.loading_positions'
              : 'defi_positions.no_positions',
          )}
        </Text>
      </View>
    );
  }

  return (
    <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}>
      <DeFiPositionsControlBar />
      <View>
        <FlatList
          testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
          data={formattedDeFiPositions}
          renderItem={({ item: { chainId, protocolAggregate } }) => (
            <DeFiPositionsListItem
              chainId={chainId}
              protocolAggregate={protocolAggregate}
              privacyMode={privacyMode}
            />
          )}
          keyExtractor={(_, index) => index.toString()}
        />
      </View>
    </View>
  );
};

export default DeFiPositionsTab;
