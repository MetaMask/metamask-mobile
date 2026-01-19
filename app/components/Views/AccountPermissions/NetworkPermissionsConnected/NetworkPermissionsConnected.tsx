// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import { getNetworkImageSource } from '../../../../util/networks';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../selectors/networkController';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import NetworkSelectorList from '../../../../components/UI/NetworkSelectorList/NetworkSelectorList';
import Logger from '../../../../util/Logger';

// Internal dependencies.
import { NetworkPermissionsConnectedProps } from './NetworkPermissionsConnected.types';
import styles from './NetworkPermissionsConnected.styles';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { NetworkNonPemittedBottomSheetSelectorsIDs } from '../../NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import { handleNetworkSwitch } from '../../../../util/networks/handleNetworkSwitch';
import { getCaip25Caveat } from '../../../../core/Permissions';
import { getPermittedEthChainIds } from '@metamask/chain-agnostic-permission';
import { toHex } from '@metamask/controller-utils';
import { parseCaipChainId } from '@metamask/utils';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../../constants/popular-networks';

// Needs to be updated to handle non-evm
const NetworkPermissionsConnected = ({
  onSetPermissionsScreen,
  onDismissSheet,
  hostname,
  favicon,
}: NetworkPermissionsConnectedProps) => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const evmChainId = useSelector(selectEvmChainId);
  const evmCaipChainId = `eip155:${parseInt(evmChainId, 16)}`;

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  // Get permitted chain IDs
  const getPermittedChainIds = () => {
    try {
      const caveat = getCaip25Caveat(hostname);
      if (!caveat) {
        return [];
      }
      return getPermittedEthChainIds(caveat.value);
    } catch (e) {
      Logger.error(e as Error, 'Error getting permitted chains caveat');
    }
    // If no permitted chains found, default to current chain
    return evmChainId ? [evmChainId] : [];
  };

  const permittedChainIds = getPermittedChainIds();

  // Filter networks to only show permitted ones, excluding the active network
  const networks = Object.entries(networkConfigurations)
    .filter(([key]) => permittedChainIds.includes(toHex(key)))
    .map(([key, network]) => ({
      id: key,
      name: network.name,
      isSelected: false,
      imageSource: getNetworkImageSource({
        chainId: network.chainId,
      }),
      caipChainId: `eip155:${parseInt(network.chainId, 16)}` as const,
    }));

  return (
    <>
      <View style={styles.header}>
        <Avatar
          variant={AvatarVariant.Favicon}
          imageSource={favicon}
          size={AvatarSize.Md}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle} variant={TextVariant.HeadingSM}>
            {strings('permissions.permitted_networks')}
          </Text>
          <View style={styles.infoButtonContainer}>
            <ButtonIcon
              size={ButtonIconSizes.Md}
              iconName={IconName.Info}
              iconColor={IconColor.Default}
              onPress={() => {
                navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                  screen: Routes.SHEET.PERMITTED_NETWORKS_INFO_SHEET,
                });
              }}
            />
          </View>
        </View>
      </View>
      <View style={styles.networkSelectorListContainer}>
        <NetworkSelectorList
          networks={networks}
          onSelectNetwork={(onSelectChainId) => {
            if (onSelectChainId === evmCaipChainId) {
              onDismissSheet();
              return;
            }

            const { reference } = parseCaipChainId(onSelectChainId);

            // This helper needs to work with caipChainIds so that this component
            // can be updated to work with non-evm networks
            const theNetworkName = handleNetworkSwitch(reference);

            if (theNetworkName) {
              const targetChainId = toHex(reference);
              trackEvent(
                createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
                  .addProperties({
                    chain_id: reference,
                    from_network: evmChainId,
                    to_network: targetChainId,
                    custom_network:
                      !POPULAR_NETWORK_CHAIN_IDS.has(targetChainId),
                  })
                  .build(),
              );
              onDismissSheet();
            }
          }}
          selectedChainIds={[]}
          isMultiSelect={false}
        />
      </View>
      <Button
        style={styles.managePermissionsButton}
        variant={ButtonVariants.Secondary}
        label={strings('permissions.edit_permissions')}
        testID={
          NetworkNonPemittedBottomSheetSelectorsIDs.EDIT_PERMISSIONS_BUTTON
        }
        size={ButtonSize.Lg}
        onPress={() => {
          onSetPermissionsScreen(AccountPermissionsScreens.ConnectMoreNetworks);
        }}
        width={ButtonWidthTypes.Full}
      />
    </>
  );
};

export default NetworkPermissionsConnected;
