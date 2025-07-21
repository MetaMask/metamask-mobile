import React, { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import {
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectChainId,
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
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import TextComponent, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const DeFiPositionsControlBar: React.FC = () => {
  const { styles } = useStyles(styleSheet, undefined);

  const navigation = useNavigation();
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const networkName = useSelector(selectNetworkName);
  const currentChainId = useSelector(selectChainId) as Hex;

  const { enabledNetworks, getNetworkInfo } = useCurrentNetworkInfo();

  const currentNetworkName = getNetworkInfo(0)?.networkName;

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

  return (
    <View style={styles.actionBarWrapper}>
      <ButtonBase
        testID={WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER}
        label={
          <>
            {isRemoveGlobalNetworkSelectorEnabled() ? (
              <TextComponent
                variant={TextVariant.BodyMDMedium}
                style={styles.controlButtonText}
                numberOfLines={1}
              >
                {enabledNetworks.length > 1
                  ? strings('networks.enabled_networks')
                  : currentNetworkName ?? strings('wallet.current_network')}
              </TextComponent>
            ) : (
              <TextComponent
                variant={TextVariant.BodyMDMedium}
                style={styles.controlButtonText}
                numberOfLines={1}
              >
                {isAllNetworks && isPopularNetwork
                  ? strings('wallet.popular_networks')
                  : networkName ?? strings('wallet.current_network')}
              </TextComponent>
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
        size={ButtonIconSizes.Lg}
      />
    </View>
  );
};

export default DeFiPositionsControlBar;
