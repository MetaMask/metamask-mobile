import React, { useMemo } from 'react';
import { View, FlatList } from 'react-native';
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
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

export const DEFI_POSITIONS_CONTAINER = 'defi_positions_container';

export interface DeFiPositionsListProps {
  tabLabel: string;
}

const DeFiPositionsList: React.FC<DeFiPositionsListProps> = () => {
  const styles = styleSheet();

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
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings(
            formattedDeFiPositions === undefined
              ? 'defi_positions.loading_positions'
              : formattedDeFiPositions === null
              ? 'defi_positions.error_fetching_positions'
              : 'defi_positions.no_positions',
          )}
        </Text>
      </View>
    );
  }

  return (
    <View testID={DEFI_POSITIONS_CONTAINER}>
      <DeFiPositionsControlBar />
      <View>
        <FlatList
          data={formattedDeFiPositions}
          renderItem={({ item: { chainId, protocolAggregate } }) => (
            <DeFiPositionsListItem
              chainId={chainId}
              protocolAggregate={protocolAggregate}
              privacyMode={privacyMode}
            />
          )}
          keyExtractor={(protocolChainAggregate) =>
            `${protocolChainAggregate.chainId}-${protocolChainAggregate.protocolAggregate.protocolDetails.name}`
          }
        />
      </View>
    </View>
  );
};

export default DeFiPositionsList;
