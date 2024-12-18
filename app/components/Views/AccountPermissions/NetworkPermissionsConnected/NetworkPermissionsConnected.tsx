// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import PickerNetwork from '../../../../component-library/components/Pickers/PickerNetwork';
import {
  getDecimalChainId,
  isMultichainVersion1Enabled,
  getNetworkImageSource,
} from '../../../../util/networks';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectProviderConfig,
  ProviderConfig,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { useNetworkInfo } from '../../../../selectors/selectedNetworkController';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import NetworkSelectorList from '../../../../components/UI/NetworkSelectorList/NetworkSelectorList';
import Engine from '../../../../core/Engine';
import { PermissionKeys } from '../../../../core/Permissions/specifications';
import { CaveatTypes } from '../../../../core/Permissions/constants';
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

const AccountPermissionsConnected = ({
  onSetPermissionsScreen,
  onDismissSheet,
  hostname,
  favicon,
  secureIcon,
  urlWithProtocol,
}: NetworkPermissionsConnectedProps) => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);

  const { networkName, networkImageSource } = useNetworkInfo(hostname);

  const openRevokePermissions = () =>
    onSetPermissionsScreen(AccountPermissionsScreens.Revoke);

  const switchNetwork = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED)
        .addProperties({
          chain_id: getDecimalChainId(providerConfig.chainId),
        })
        .build(),
    );
  }, [providerConfig.chainId, navigate, trackEvent, createEventBuilder]);

  const networkConfigurations = useSelector(selectNetworkConfigurations);

  // Get permitted chain IDs
  const getPermittedChainIds = () => {
    try {
      const caveat = Engine.context.PermissionController.getCaveat(
        hostname,
        PermissionKeys.permittedChains,
        CaveatTypes.restrictNetworkSwitching,
      );
      if (Array.isArray(caveat?.value)) {
        return caveat.value.filter(
          (item): item is string => typeof item === 'string',
        );
      }
    } catch (e) {
      Logger.error(e as Error, 'Error getting permitted chains caveat');
    }
    // If no permitted chains found, default to current chain
    return providerConfig?.chainId ? [providerConfig.chainId] : [];
  };

  const permittedChainIds = getPermittedChainIds();

  // Filter networks to only show permitted ones, excluding the active network
  const networks = Object.entries(networkConfigurations)
    .filter(([key]) => permittedChainIds.includes(key))
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
      {!isMultichainVersion1Enabled && (
        <SheetHeader title={strings('accounts.connected_accounts_title')} />
      )}
      {isMultichainVersion1Enabled && (
        <View style={styles.header}>
          <Avatar
            variant={AvatarVariant.Favicon}
            imageSource={favicon}
            size={AvatarSize.Md}
          />
        </View>
      )}
      <View style={styles.body}>
        {!isMultichainVersion1Enabled && (
          <TagUrl
            imageSource={favicon}
            label={urlWithProtocol}
            cta={{
              label: strings('accounts.permissions'),
              onPress: openRevokePermissions,
            }}
            iconName={secureIcon}
          />
        )}
        {isMultichainVersion1Enabled && (
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
        )}
        {!isMultichainVersion1Enabled && (
          <PickerNetwork
            label={providerConfig?.nickname || networkName}
            imageSource={networkImageSource}
            onPress={switchNetwork}
            style={styles.networkPicker}
            testID={ConnectedAccountsSelectorsIDs.NETWORK_PICKER}
          />
        )}
      </View>
      <View style={styles.networkSelectorListContainer}>
        <NetworkSelectorList
          networks={networks}
          onSelectNetwork={(chainId) => {
            if (chainId === providerConfig?.chainId) {
              onDismissSheet();
              return;
            }

            const theNetworkName = handleNetworkSwitch(
              getDecimalChainId(chainId),
            );

            if (theNetworkName) {
              trackEvent(
                createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
                  .addProperties({
                    chain_id: getDecimalChainId(chainId),
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
      {isMultichainVersion1Enabled && (
        <Button
          style={styles.managePermissionsButton}
          variant={ButtonVariants.Secondary}
          label={strings('permissions.edit_permissions')}
          testID={
            NetworkNonPemittedBottomSheetSelectorsIDs.EDIT_PERMISSIONS_BUTTON
          }
          size={ButtonSize.Lg}
          onPress={() => {
            onSetPermissionsScreen(
              AccountPermissionsScreens.ConnectMoreNetworks,
            );
          }}
          width={ButtonWidthTypes.Full}
        />
      )}
    </>
  );
};

export default AccountPermissionsConnected;
