import React, { useMemo, useCallback } from 'react';
import { View, VirtualizedList } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  selectChainId,
  selectIsAllNetworks,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import {
  selectDeFiPositionsByAddress,
  selectDefiPositionsByEnabledNetworks,
} from '../../../selectors/defiPositionsController';
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
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import { DefiEmptyState } from '../DefiEmptyState';
export interface DeFiPositionsListProps {
  tabLabel: string;
}

const DeFiPositionsList: React.FC<DeFiPositionsListProps> = () => {
  const { styles } = useStyles(styleSheet, undefined);
  const tw = useTailwind();
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const currentChainId = useSelector(selectChainId) as Hex;
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const defiPositions = useSelector(selectDeFiPositionsByAddress);
  const defiPositionsByEnabledNetworks = useSelector(
    selectDefiPositionsByEnabledNetworks,
  );
  const privacyMode = useSelector(selectPrivacyMode);

  const formattedDeFiPositions = useMemo(() => {
    if (!defiPositions) {
      return defiPositions;
    }

    let chainFilteredDeFiPositions: { [key: Hex]: GroupedDeFiPositions };
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      chainFilteredDeFiPositions = defiPositionsByEnabledNetworks as {
        [key: Hex]: GroupedDeFiPositions;
      };
    } else if (isAllNetworks) {
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
        Object.entries(chainDeFiPositions.protocols).map(
          ([protocolId, protocolAggregate]) => ({
            chainId: toHex(chainId),
            protocolId,
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
  }, [
    defiPositions,
    isAllNetworks,
    currentChainId,
    tokenSortConfig,
    defiPositionsByEnabledNetworks,
  ]);

  if (!formattedDeFiPositions) {
    if (formattedDeFiPositions === undefined) {
      // Position data is still loading
      return (
        <View style={styles.emptyView}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.loading_positions')}
          </Text>
        </View>
      );
    } else if (formattedDeFiPositions === null) {
      // Error fetching position data
      return (
        <View style={styles.emptyView}>
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
        </View>
      );
    }
  }

  if (formattedDeFiPositions.length === 0) {
    // No positions found for the current account
    return (
      <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}>
        <DeFiPositionsControlBar />
        <DefiEmptyState style={tw.style('mx-auto')} />
      </View>
    );
  }

  const getItem = useCallback(
    (data: typeof formattedDeFiPositions, index: number) => data[index],
    [],
  );

  const getItemCount = useCallback(
    (data: typeof formattedDeFiPositions) => data.length,
    [],
  );

  const keyExtractor = useCallback(
    (protocolChainAggregate: (typeof formattedDeFiPositions)[0]) =>
      `${protocolChainAggregate.chainId}-${protocolChainAggregate.protocolAggregate.protocolDetails.name}`,
    [],
  );

  const renderItem = useCallback(
    ({
      item: { chainId, protocolId, protocolAggregate },
    }: {
      item: (typeof formattedDeFiPositions)[0];
    }) => (
      <DeFiPositionsListItem
        chainId={chainId}
        protocolId={protocolId}
        protocolAggregate={protocolAggregate}
        privacyMode={privacyMode}
      />
    ),
    [privacyMode],
  );

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}
    >
      <DeFiPositionsControlBar />
      <VirtualizedList
        testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}
        data={formattedDeFiPositions}
        initialNumToRender={10}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemCount={getItemCount}
        getItem={getItem}
        scrollEnabled={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
    </View>
  );
};

export default DeFiPositionsList;
