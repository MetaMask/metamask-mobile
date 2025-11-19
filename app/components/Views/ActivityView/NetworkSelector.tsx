import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { IconName } from '../../../component-library/components/Icons/Icon';
import TextComponent, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import {
  getNetworkImageSource,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import { createNetworkManagerNavDetails } from '../../UI/NetworkManager';
import { createTokenBottomSheetFilterNavDetails } from '../../UI/Tokens/TokensBottomSheet';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import {
  NetworkType,
  useNetworksByNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';

const createStyles = (
  colors: {
    background: { default: string };
    border: { default: string };
    text: { default: string };
  },
  isGlobalNetworkSelectorRemoved: boolean,
) =>
  StyleSheet.create({
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 8,
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: !isGlobalNetworkSelectorRemoved
        ? colors.border.default
        : undefined,
      borderStyle: 'solid',
      borderWidth: isGlobalNetworkSelectorRemoved ? 1 : 0,
      borderRadius: isGlobalNetworkSelectorRemoved ? 8 : 0,
      maxWidth: isGlobalNetworkSelectorRemoved ? '80%' : '60%',
      paddingHorizontal: isGlobalNetworkSelectorRemoved ? 12 : 0,
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: !isGlobalNetworkSelectorRemoved
        ? colors.border.default
        : undefined,
      borderStyle: 'solid',
      marginRight: 4,
      borderWidth: isGlobalNetworkSelectorRemoved ? 1 : 0,
      borderRadius: isGlobalNetworkSelectorRemoved ? 8 : 0,
      maxWidth: isGlobalNetworkSelectorRemoved ? '80%' : '60%',
      paddingHorizontal: isGlobalNetworkSelectorRemoved ? 12 : 0,
      opacity: 0.5,
    },
    networkManagerWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    titleText: {
      color: colors.text.default,
    },
  });

export const ActivityNetworkSelector = () => {
  const { colors } = useTheme();
  const isGlobalNetworkSelectorRemoved = isRemoveGlobalNetworkSelectorEnabled();
  const styles = createStyles(colors, isGlobalNetworkSelectorRemoved);
  const navigation = useNavigation();

  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);

  const { enabledNetworks, getNetworkInfo, isDisabled } =
    useCurrentNetworkInfo();
  const { areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });

  const currentNetworkName = getNetworkInfo(0)?.networkName;

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  // TODO: Placeholder variable for now until we update the network enablement controller
  const firstEnabledChainId = enabledNetworks[0]?.chainId || '';
  const networkImageSource = getNetworkImageSource({
    chainId: firstEnabledChainId,
  });

  const showFilterControls = () => {
    if (isGlobalNetworkSelectorRemoved) {
      navigation.navigate(...createNetworkManagerNavDetails({}));
    } else {
      navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
    }
  };

  return (
    <View style={styles.controlButtonOuterWrapper}>
      <ButtonBase
        testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
        label={
          <>
            {isGlobalNetworkSelectorRemoved ? (
              <View style={styles.networkManagerWrapper}>
                {!areAllNetworksSelected && (
                  <Avatar
                    variant={AvatarVariant.Network}
                    size={AvatarSize.Xs}
                    name={networkName}
                    imageSource={networkImageSource}
                  />
                )}
                <TextComponent
                  variant={TextVariant.BodyMDMedium}
                  style={styles.titleText}
                  numberOfLines={1}
                >
                  {enabledNetworks.length > 1
                    ? strings('wallet.popular_networks')
                    : (currentNetworkName ?? strings('wallet.current_network'))}
                </TextComponent>
              </View>
            ) : (
              <TextComponent
                variant={TextVariant.BodyMDMedium}
                style={styles.titleText}
                numberOfLines={1}
              >
                {networkName ?? strings('wallet.current_network')}
              </TextComponent>
            )}
          </>
        }
        isDisabled={isDisabled && !isMultichainAccountsState2Enabled}
        onPress={
          isEvmSelected || isMultichainAccountsState2Enabled
            ? showFilterControls
            : () => null
        }
        endIconName={
          isEvmSelected || isMultichainAccountsState2Enabled
            ? IconName.ArrowDown
            : undefined
        }
        style={
          isDisabled && !isMultichainAccountsState2Enabled
            ? styles.controlButtonDisabled
            : styles.controlButton
        }
        disabled={isDisabled && !isMultichainAccountsState2Enabled}
      />
    </View>
  );
};
