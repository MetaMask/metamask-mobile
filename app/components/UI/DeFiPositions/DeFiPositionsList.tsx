import React, { useMemo } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
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
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { DefiEmptyState } from '../DefiEmptyState';
import { selectHomepageRedesignV1Enabled } from '../../../selectors/featureFlagController/homepage';
import ConditionalScrollView from '../../../component-library/components-temp/ConditionalScrollView';

export interface DeFiPositionsListProps {
  tabLabel: string;
}

const DeFiPositionsList: React.FC<DeFiPositionsListProps> = () => {
  const { styles } = useStyles(styleSheet, undefined);
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

    const chainFilteredDeFiPositions = defiPositionsByEnabledNetworks as {
      [key: Hex]: GroupedDeFiPositions;
    };

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
  }, [defiPositions, tokenSortConfig, defiPositionsByEnabledNetworks]);

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

  const content = (
    <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}>
      {formattedDeFiPositions.map(
        ({ chainId, protocolId, protocolAggregate }) => (
          <DeFiPositionsListItem
            key={`${chainId}-${protocolAggregate.protocolDetails.name}`}
            chainId={chainId}
            protocolId={protocolId}
            protocolAggregate={protocolAggregate}
            privacyMode={privacyMode}
          />
        ),
      )}
    </View>
  );

  return (
    <View
      style={!isHomepageRedesignV1Enabled ? styles.wrapper : undefined}
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}
    >
      <DeFiPositionsControlBar />
      {formattedDeFiPositions.length > 0 ? (
        <ConditionalScrollView
          isScrollEnabled={!isHomepageRedesignV1Enabled}
          scrollViewProps={{
            testID: WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
          }}
        >
          {content}
        </ConditionalScrollView>
      ) : (
        <DefiEmptyState twClassName="mx-auto mt-4" />
      )}
    </View>
  );
};

export default DeFiPositionsList;
