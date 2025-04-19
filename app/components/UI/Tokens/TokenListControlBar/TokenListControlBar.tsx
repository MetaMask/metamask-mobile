import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import ButtonBase from '../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { useTheme } from '../../../../util/theme';
import createStyles from '../styles';
import { isTestNet } from '../../../../util/networks';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../../selectors/networkController';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../locales/i18n';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from '../TokensBottomSheet';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface TokenListControlBarProps {
  goToAddToken?: () => void;
}

export const TokenListControlBar = ({
  goToAddToken,
}: TokenListControlBarProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const currentChainId = useSelector(selectChainId);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);

  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();

  const isDisabled = isTestNet(currentChainId) || !isPopularNetwork;

  const showFilterControls = useCallback(() => {
    navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
  }, [navigation]);

  const showSortControls = useCallback(() => {
    navigation.navigate(...createTokensBottomSheetNavDetails({}));
  }, [navigation]);

  return (
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
          isDisabled={isDisabled}
          onPress={isEvmSelected ? showFilterControls : () => null}
          endIconName={isEvmSelected ? IconName.ArrowDown : undefined}
          style={
            isDisabled ? styles.controlButtonDisabled : styles.controlButton
          }
          disabled={isDisabled}
        />
        <View style={styles.controlButtonInnerWrapper}>
          <ButtonIcon
            testID={WalletViewSelectorsIDs.SORT_BY}
            onPress={showSortControls}
            iconName={IconName.SwapVertical}
            style={styles.controlIconButton}
          />
          <ButtonIcon
            testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
            onPress={goToAddToken}
            iconName={IconName.Add}
            style={
              isEvmSelected
                ? styles.controlIconButton
                : styles.controlIconButtonDisabled
            }
            disabled={!isEvmSelected}
          />
        </View>
      </View>
    </View>
  );
};

export default TokenListControlBar;
