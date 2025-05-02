import React, { useCallback, useMemo } from 'react';
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
import { IconName } from '../../../component-library/components/Icons/Icon';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { Hex } from '@metamask/utils';
import { DeFiPositionsList } from './DeFiPositionsList';
import { selectDeFiPositionsByAddress } from '../../../selectors/defiPositionsController';
import { isTestNet } from '../../../util/networks';
import styleSheet from './DeFiPositionsTab.styles';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from '../Tokens/TokensBottomSheet';
import { useNavigation } from '@react-navigation/native';

export interface DeFiPositionsTabProps {
  tabLabel: string;
}

const DeFiPositionsTab: React.FC<DeFiPositionsTabProps> = () => {
  const theme = useTheme();
  const styles2 = createStyles(theme.colors);
  const styles = styleSheet({ theme });

  const navigation = useNavigation();
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const networkName = useSelector(selectNetworkName);
  const currentChainId = useSelector(selectChainId);
  const defiPositions = useSelector(selectDeFiPositionsByAddress);

  const chainFilteredDeFiPositions = useMemo(() => {
    if (!defiPositions) {
      return defiPositions;
    }

    if (isAllNetworks) {
      return defiPositions;
    }

    return {
      [currentChainId]: defiPositions[currentChainId as Hex],
    };
  }, [defiPositions, isAllNetworks, currentChainId]);

  const showFilterControls = useCallback(() => {
    navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
  }, [navigation]);

  const showSortControls = useCallback(() => {
    navigation.navigate(...createTokensBottomSheetNavDetails({}));
  }, [navigation]);

  return (
    <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}>
      <View style={styles.actionBarWrapper}>
        <ButtonBase
          testID={WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER}
          label={
            <Text numberOfLines={1}>
              {isAllNetworks && isPopularNetwork
                ? `${strings('app_settings.popular')} ${strings(
                    'app_settings.networks',
                  )}`
                : networkName ?? strings('wallet.current_network')}
            </Text>
          }
          isDisabled={isTestNet(currentChainId) || !isPopularNetwork}
          onPress={showFilterControls}
          endIconName={IconName.ArrowDown}
          style={
            isTestNet(currentChainId) || !isPopularNetwork
              ? styles2.controlButtonDisabled
              : styles2.controlButton
          }
          disabled={isTestNet(currentChainId) || !isPopularNetwork}
        />
        <ButtonIcon
          testID={WalletViewSelectorsIDs.DEFI_POSITIONS_SORT_BY}
          onPress={showSortControls}
          // onPress={() => null}
          iconName={IconName.SwapVertical}
          style={styles2.controlIconButton}
        />
      </View>
      <View>
        <DeFiPositionsList defiPositions={chainFilteredDeFiPositions} />
      </View>
    </View>
  );
};

export default DeFiPositionsTab;
