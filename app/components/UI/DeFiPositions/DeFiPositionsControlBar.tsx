import React, { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectChainId,
} from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { isTestNet } from '../../../util/networks';
import styleSheet from './DeFiPositionsControlBar.styles';
import { useNavigation } from '@react-navigation/native';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from '../Tokens/TokensBottomSheet';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

const DeFiPositionsControlBar: React.FC = () => {
  const { styles } = useStyles(styleSheet, undefined);

  const navigation = useNavigation();
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const networkName = useSelector(selectNetworkName);
  const currentChainId = useSelector(selectChainId) as Hex;

  const showFilterControls = useCallback(() => {
    navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
  }, [navigation]);

  const showSortControls = useCallback(() => {
    navigation.navigate(...createTokensBottomSheetNavDetails({}));
  }, [navigation]);

  return (
    <View style={styles.actionBarWrapper}>
      <ButtonBase
        testID={WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER}
        label={
          <Text style={styles.controlButtonText} numberOfLines={1}>
            {isAllNetworks && isPopularNetwork
              ? strings('wallet.popular_networks')
              : networkName ?? strings('wallet.current_network')}
          </Text>
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
        iconName={IconName.SwapVertical}
        style={styles.controlIconButton}
      />
    </View>
  );
};

export default DeFiPositionsControlBar;
