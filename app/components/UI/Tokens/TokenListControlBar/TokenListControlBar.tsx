import React, { useCallback } from 'react';
import { View } from 'react-native';
import ButtonBase from '../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { useTheme } from '../../../../util/theme';
import createStyles from '../styles';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../util/networks';
import { useSelector } from 'react-redux';
import {
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../../selectors/networkController';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../locales/i18n';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from '../TokensBottomSheet';
import { createNetworkManagerNavDetails } from '../../NetworkManager';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import TextComponent, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface TokenListControlBarProps {
  goToAddToken: () => void;
}

export const TokenListControlBar = ({
  goToAddToken,
}: TokenListControlBarProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isAllPopularEVMNetworks = useSelector(selectIsPopularNetwork);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);

  const { enabledNetworks, getNetworkInfo, isDisabled } =
    useCurrentNetworkInfo();

  const currentNetworkName = getNetworkInfo(0)?.networkName;

  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();

  const handleFilterControls = useCallback(() => {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      navigation.navigate(...createNetworkManagerNavDetails({}));
    } else if (isEvmSelected) {
      navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
    } else {
      return null;
    }
  }, [navigation, isEvmSelected]);

  const showSortControls = useCallback(() => {
    navigation.navigate(...createTokensBottomSheetNavDetails({}));
  }, [navigation]);

  return (
    <View style={styles.actionBarWrapper}>
      <View style={styles.controlButtonOuterWrapper}>
        <ButtonBase
          testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
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
                  {isAllNetworks && isAllPopularEVMNetworks && isEvmSelected
                    ? strings('wallet.popular_networks')
                    : networkName ?? strings('wallet.current_network')}
                </TextComponent>
              )}
            </>
          }
          isDisabled={isDisabled}
          onPress={isEvmSelected ? handleFilterControls : () => null}
          endIconName={isEvmSelected ? IconName.ArrowDown : undefined}
          style={
            isDisabled ? styles.controlButtonDisabled : styles.controlButton
          }
          disabled={isDisabled}
        />
        <View style={styles.controlButtonInnerWrapper}>
          <ButtonIcon
            testID={WalletViewSelectorsIDs.SORT_BY}
            size={ButtonIconSizes.Lg}
            onPress={showSortControls}
            iconName={IconName.Filter}
            style={styles.controlIconButton}
          />
          <ButtonIcon
            testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
            size={ButtonIconSizes.Lg}
            onPress={goToAddToken}
            iconName={IconName.Add}
            isDisabled={!isEvmSelected}
            style={styles.controlIconButton}
            disabled={!isEvmSelected}
          />
        </View>
      </View>
    </View>
  );
};

export default TokenListControlBar;
