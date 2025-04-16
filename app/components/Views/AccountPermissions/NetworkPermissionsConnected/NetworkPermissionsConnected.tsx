// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import {
  getDecimalChainId,
  getNetworkImageSource,
} from '../../../../util/networks';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectProviderConfig,
  ProviderConfig,
  selectEvmNetworkConfigurationsByChainId,
  selectEvmChainId,
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
import { NetworkNonPemittedBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Network/NetworkNonPemittedBottomSheet.selectors';
import { handleNetworkSwitch } from '../../../../util/networks/handleNetworkSwitch';
import { getCaip25Caveat } from '../../../../core/Permissions';
import { getPermittedEthChainIds } from '@metamask/chain-agnostic-permission';
import { Hex } from '@metamask/utils';

const NetworkPermissionsConnected = ({
  onSetPermissionsScreen,
  onDismissSheet,
  hostname,
  favicon,
}: NetworkPermissionsConnectedProps) => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectEvmChainId);

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
    return chainId ? [chainId] : [];
  };

  const permittedChainIds = getPermittedChainIds();

  // Filter networks to only show permitted ones, excluding the active network
  const networks = Object.entries(networkConfigurations)
    .filter(([key]) => permittedChainIds.includes(key as Hex))
    .map(([key, network]) => ({
      id: key,
      name: network.name,
      rpcUrl: network.rpcEndpoints[network.defaultRpcEndpointIndex].url,
      isSelected: false,
      //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
      imageSource: getNetworkImageSource({
        chainId: network?.chainId,
      }),
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
            if (onSelectChainId === chainId) {
              onDismissSheet();
              return;
            }

            const theNetworkName = handleNetworkSwitch(
              getDecimalChainId(onSelectChainId),
            );

            if (theNetworkName) {
              trackEvent(
                createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
                  .addProperties({
                    chain_id: getDecimalChainId(onSelectChainId),
                    from_network: providerConfig?.nickname || theNetworkName,
                    to_network: theNetworkName,
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
