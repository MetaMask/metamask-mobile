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
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
export interface DeFiPositionsListProps {
  tabLabel: string;
}

const DeFiPositionsList: React.FC<DeFiPositionsListProps> = () => {
  const { styles } = useStyles(styleSheet, undefined);

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
    let emptyContent;

    if (formattedDeFiPositions === undefined) {
      // Position data is still loading
      emptyContent = (
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('defi_positions.loading_positions')}
        </Text>
      );
    } else if (formattedDeFiPositions === null) {
      // Error fetching position data
      emptyContent = (
        <>
          <Icon
            name={IconName.Danger}
            color={IconColor.Alternative}
            size={IconSize.Md}
          />
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.error_cannot_load_page')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.error_visit_again')}
          </Text>
        </>
      );
    } else {
      // No positions found for the current account
      emptyContent = (
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('defi_positions.no_positions')}
        </Text>
      );
    }

    return <View style={styles.emptyView}>{emptyContent}</View>;
  }

  return (
    <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}>
      <DeFiPositionsControlBar />
      <View>
        <FlatList
          testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}
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
