import React, { useMemo } from 'react';
import { View, FlatList } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
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
import { selectHomepageRedesignV1Enabled } from '../../../selectors/featureFlagController/homepage';
export interface DeFiPositionsListProps {
  tabLabel: string;
}

const DeFiPositionsList: React.FC<DeFiPositionsListProps> = () => {
  const { styles } = useStyles(styleSheet, undefined);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const currentChainId = useSelector(selectChainId) as Hex;
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const defiPositions = useSelector(selectDeFiPositionsByAddress);
  const defiPositionsByEnabledNetworks = useSelector(
    selectDefiPositionsByEnabledNetworks,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

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

  const estimatedItemHeight = 72;
  const calculatedListHeight = useMemo(() => {
    if (!isHomepageRedesignV1Enabled) return undefined;

    const itemCount = formattedDeFiPositions?.length || 0;
    const contentHeight = itemCount * estimatedItemHeight;
    const emptyStateHeight = itemCount === 0 ? 200 : 0;
    const padding = 20;

    return contentHeight + emptyStateHeight + padding;
  }, [isHomepageRedesignV1Enabled, formattedDeFiPositions?.length]);

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

  const flatListContent = (
    <FlatList
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}
      data={formattedDeFiPositions}
      renderItem={({ item: { chainId, protocolId, protocolAggregate } }) => (
        <DeFiPositionsListItem
          chainId={chainId}
          protocolId={protocolId}
          protocolAggregate={protocolAggregate}
          privacyMode={privacyMode}
        />
      )}
      keyExtractor={(protocolChainAggregate) =>
        `${protocolChainAggregate.chainId}-${protocolChainAggregate.protocolAggregate.protocolDetails.name}`
      }
      scrollEnabled={!isHomepageRedesignV1Enabled}
      ListEmptyComponent={<DefiEmptyState twClassName="mx-auto mt-4" />}
    />
  );

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}
    >
      <DeFiPositionsControlBar />
      {isHomepageRedesignV1Enabled && calculatedListHeight ? (
        <View style={{ height: calculatedListHeight }}>{flatListContent}</View>
      ) : (
        flatListContent
      )}
    </View>
  );
};

export default DeFiPositionsList;
