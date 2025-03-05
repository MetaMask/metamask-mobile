import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { isPortfolioViewEnabled, isTestNet } from '../../../util/networks';
import { IconName } from '../../../component-library/components/Icons/Icon';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import Logger from '../../../util/Logger';
import { Hex } from '@metamask/utils';
import { GroupedPositions } from '@metamask/assets-controllers';

export interface DeFiPositionsProps {
  tabLabel: string;
  defiPositions: { [key: Hex]: GroupedPositions } | null;
}

const DeFiPositions: React.FC<DeFiPositionsProps> = ({ defiPositions }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);
  const currentChainId = useSelector(selectChainId);

  Logger.log('PROPERTIES', {
    isAllNetworks,
    isPopularNetwork,
    isEvmSelected,
    networkName,
    currentChainId,
    portfolioViewEnabled: isPortfolioViewEnabled(),
  });

  const defiPositionsList = useMemo(() => {
    if (!defiPositions) {
      return [];
    }

    const currentChainPositions = defiPositions?.[currentChainId as Hex];
    if (!currentChainPositions) {
      return [];
    }

    const positionsByProtocol = currentChainPositions.protocols;

    return currentChainPositions.positions;
  }, [defiPositions, isPopularNetwork, isAllNetworks, currentChainId]);

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}
    >
      <View style={styles.actionBarWrapper}>
        <View style={styles.controlButtonOuterWrapper}>
          <ButtonBase
            testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
            label={
              <Text style={styles.controlButtonText} numberOfLines={1}>
                {isAllNetworks && isPopularNetwork && isEvmSelected
                  ? `${strings('app_settings.popular')} ${strings(
                      'app_settings.networks',
                    )}`
                  : networkName ?? strings('wallet.current_network')}
              </Text>
            }
            isDisabled={isTestNet(currentChainId) || !isPopularNetwork}
            // onPress={isEvmSelected ? showFilterControls : () => null}
            onPress={() => null}
            endIconName={isEvmSelected ? IconName.ArrowDown : undefined}
            style={
              isTestNet(currentChainId) || !isPopularNetwork
                ? styles.controlButtonDisabled
                : styles.controlButton
            }
            disabled={isTestNet(currentChainId) || !isPopularNetwork}
          />
          <View style={styles.controlButtonInnerWrapper}>
            <ButtonIcon
              testID={WalletViewSelectorsIDs.SORT_BY}
              // onPress={showSortControls}
              onPress={() => null}
              iconName={IconName.SwapVertical}
              style={styles.controlIconButton}
            />
          </View>
        </View>
      </View>
      <View>
        <Text>DeFi Positions List</Text>
      </View>
    </View>
  );
};

export default DeFiPositions;
