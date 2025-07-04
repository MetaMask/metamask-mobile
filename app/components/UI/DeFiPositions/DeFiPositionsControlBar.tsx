import React, { useCallback } from 'react';
import { Hex, parseCaipChainId } from '@metamask/utils';
import { Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import {
  isTestNet,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import styleSheet from './DeFiPositionsControlBar.styles';
import { useNavigation } from '@react-navigation/native';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from '../Tokens/TokensBottomSheet';
import { createNetworkManagerNavDetails } from '../NetworkManager';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectedSelectedMultichainNetworkChainId } from '../../../selectors/multichainNetworkController';

const DeFiPositionsControlBar: React.FC = () => {
  const { styles } = useStyles(styleSheet, undefined);

  const navigation = useNavigation();
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const networkName = useSelector(selectNetworkName);
  const currentChainId = useSelector(selectChainId) as Hex;
  const networksByNameSpace = useSelector(selectEnabledNetworksByNamespace);
  const currentCaipChainId = useSelector(
    selectedSelectedMultichainNetworkChainId,
  );
  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const { namespace } = parseCaipChainId(currentCaipChainId);

  const showFilterControls = useCallback(() => {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      navigation.navigate(...createNetworkManagerNavDetails({}));
    } else {
      navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
    }
  }, [navigation]);

  const showSortControls = useCallback(() => {
    navigation.navigate(...createTokensBottomSheetNavDetails({}));
  }, [navigation]);

  // TODO: Come back to refactor this logic is used in several places
  const enabledNetworks = Object.entries(networksByNameSpace[namespace])
    .filter(([_key, value]) => value)
    .map(([chainId, enabled]) => ({ chainId, enabled }));
  const caipChainId = formatChainIdToCaip(enabledNetworks[0].chainId);
  const currentNetworkName = networksByCaipChainId[caipChainId].name;

  return (
    <View style={styles.actionBarWrapper}>
      <ButtonBase
        testID={WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER}
        label={
          <>
            {isRemoveGlobalNetworkSelectorEnabled() ? (
              <Text style={styles.controlButtonText} numberOfLines={1}>
                {enabledNetworks.length > 1
                  ? strings('networks.enabled_networks')
                  : currentNetworkName ?? strings('wallet.current_network')}
              </Text>
            ) : (
              <Text style={styles.controlButtonText} numberOfLines={1}>
                {isAllNetworks && isPopularNetwork
                  ? strings('wallet.popular_networks')
                  : networkName ?? strings('wallet.current_network')}
              </Text>
            )}
          </>
        }
        isDisabled={isTestNet(currentChainId) || !isPopularNetwork}
        onPress={showFilterControls}
        endIconName={IconName.ArrowDown}
        style={
          isTestNet(currentChainId) || !isPopularNetwork
            ? styles.controlButtonDisabled
            : styles.controlButton
        }
        disabled={isTestNet(currentChainId) || !isPopularNetwork}
      />
      <ButtonIcon
        onPress={showSortControls}
        iconName={IconName.Filter}
        style={styles.controlIconButton}
      />
    </View>
  );
};

export default DeFiPositionsControlBar;
