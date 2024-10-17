// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Platform, SafeAreaView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';

import { useStyles } from '../../../../component-library/hooks';
import { USER_INTENT } from '../../../../constants/permissions';
import HelpText, {
  HelpTextSeverity,
} from '../../../../component-library/components/Form/HelpText';
import { Network } from '../../../../components/UI/NetworkSelectorList/NetworkSelectorList.types';

// Internal dependencies.
import ConnectNetworkModalSelectorsIDs from '../../../../../e2e/selectors/Modals/ConnectNetworkModal.selectors';
import styleSheet from './NetworkConnectMultiSelector.styles';
import { NetworkConnectMultiSelectorProps } from './NetworkConnectMultiSelector.types';
import Routes from '../../../../constants/navigation/Routes';
import Checkbox from '../../../../component-library/components/Checkbox';
import NetworkSelectorList from '../../../UI/NetworkSelectorList/NetworkSelectorList';
import { PopularList } from '../../../../util/networks/customNetworks';
import {
  selectEnabledNetworkList,
  EnabledNetwork,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { NetworkConfiguration } from '@metamask/network-controller';
import Engine from '../../../../core/Engine';
import { PermissionKeys } from '../../../../core/Permissions/specifications';
import { CaveatTypes } from '../../../../core/Permissions/constants';

const NetworkConnectMultiSelector = ({
  isLoading,
  onUserAction,
  urlWithProtocol,
  hostname,
  onBack,
  isRenderedAsBottomSheet = true,
}: NetworkConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });
  const { navigate } = useNavigation();
  const [selectedChainIds, setSelectedChainIds] = useState<string[]>([]);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const handleUpdateNetworkPermissions = useCallback(async () => {
    console.log('ALEX LOGGING: selectedChainIds', selectedChainIds);
    try {
      await Engine.context.PermissionController.grantPermissionsIncremental({
        subject: {
          origin: hostname,
        },
        approvedPermissions: {
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: selectedChainIds,
              },
            ],
          },
        },
        preserveExistingPermissions: false,
      });
    } catch (e) {
      console.log('ALEX LOGGING: error', e);
    }
  }, [selectedChainIds, hostname]);

  // { chainId: '0xaa36a7',
  //   rpcEndpoints:
  //    [ { networkClientId: 'sepolia',
  //        url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
  //        type: 'infura' } ],
  //   defaultRpcEndpointIndex: 0,
  //   blockExplorerUrls: [ 'https://sepolia.etherscan.io' ],
  //   defaultBlockExplorerUrlIndex: 0,
  //   name: 'Sepolia',
  //   nativeCurrency: 'SepoliaETH' },

  const networks = Object.entries(networkConfigurations).map(
    ([key, network]) => ({
      id: key,
      name: network.name,
      rpcUrl: network.rpcEndpoints[network.defaultRpcEndpointIndex].url,
      isSelected: false,
      imageSource: 'test',
    }),
  );

  // const networks: Network[] = PopularList.map((network) => ({
  //   id: network.chainId,
  //   name: network.nickname,
  //   rpcUrl: network.rpcUrl,
  //   isSelected: false,
  //   imageSource: network.rpcPrefs.imageSource,
  // }));

  const onSelectNetwork = useCallback(
    (clickedChainId) => {
      const selectedAddressIndex = selectedChainIds.indexOf(clickedChainId);
      // Reconstruct selected network ids.
      const newNetworkList = networks.reduce((acc, { id }) => {
        if (clickedChainId === id) {
          selectedAddressIndex === -1 && acc.push(id);
        } else if (selectedChainIds.includes(id)) {
          acc.push(id);
        }
        return acc;
      }, [] as string[]);
      console.log('ALEX LOGGING: newNetworkList', newNetworkList);
      setSelectedChainIds(newNetworkList);
    },
    [networks, selectedChainIds],
  );

  const toggleRevokeAllNetworkPermissionsModal = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS,
      params: {
        hostInfo: {
          metadata: {
            origin: urlWithProtocol && new URL(urlWithProtocol).hostname,
          },
        },
      },
    });
  }, [navigate, urlWithProtocol]);

  const areAllNetworksSelected = networks
    .map(({ id }) => id)
    .every((id) => selectedChainIds.includes(id));

  const areAnyNetworksSelected = selectedChainIds?.length !== 0;
  const areNoNetworksSelected = selectedChainIds?.length === 0;

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
    const areSomeNetworksSelectedButNotAll =
      areAnyNetworksSelected && !areAllNetworksSelected;

    const selectAll = () => {
      if (isLoading) return;
      const allSelectedChainIds = networks.map(({ id }) => id);
      setSelectedChainIds(allSelectedChainIds);
    };

    const unselectAll = () => {
      if (isLoading) return;
      setSelectedChainIds([]);
    };

    const onPress = () => {
      areAllNetworksSelected ? unselectAll() : selectAll();
    };

    return (
      <View>
        <Checkbox
          style={styles.selectAllContainer}
          label={strings('networks.select_all')}
          isIndeterminate={areSomeNetworksSelectedButNotAll}
          isChecked={areAllNetworksSelected}
          onPress={onPress}
        ></Checkbox>
      </View>
    );
  }, [
    areAllNetworksSelected,
    areAnyNetworksSelected,
    networks,
    isLoading,
    setSelectedChainIds,
    styles.selectAllContainer,
  ]);

  const renderCtaButtons = useCallback(() => {
    const isConnectDisabled = Boolean(!selectedChainIds.length) || isLoading;

    return (
      <View style={styles.buttonsContainer}>
        <View style={styles.updateButtonContainer}>
          {areAnyNetworksSelected && (
            <Button
              variant={ButtonVariants.Primary}
              label={strings('networks.update')}
              onPress={handleUpdateNetworkPermissions}
              size={ButtonSize.Lg}
              style={{
                ...styles.buttonPositioning,
                ...(isConnectDisabled && styles.disabledOpacity),
              }}
              disabled={isConnectDisabled}
              {...generateTestId(
                Platform,
                ConnectNetworkModalSelectorsIDs.SELECT_MULTI_BUTTON,
              )}
            />
          )}
        </View>
        {areNoNetworksSelected && (
          <View style={styles.disconnectAll}>
            <View style={styles.helpText}>
              <HelpText severity={HelpTextSeverity.Error}>
                {strings('common.disconnect_you_from', {
                  dappUrl: hostname,
                })}
              </HelpText>
            </View>
            <View style={styles.disconnectAllButton}>
              <Button
                variant={ButtonVariants.Primary}
                label={strings('common.disconnect')}
                onPress={toggleRevokeAllNetworkPermissionsModal}
                isDanger
                size={ButtonSize.Lg}
                style={{
                  ...styles.buttonPositioning,
                }}
              />
            </View>
          </View>
        )}
      </View>
    );
  }, [
    handleUpdateNetworkPermissions,
    areAnyNetworksSelected,
    isLoading,
    selectedChainIds,
    styles,
    areNoNetworksSelected,
    hostname,
    toggleRevokeAllNetworkPermissionsModal,
  ]);

  const renderNetworkConnectMultiSelector = useCallback(
    () => (
      <SafeAreaView>
        <View style={styles.bottomSheetContainer}>
          <SheetHeader
            title={strings('networks.edit_networks_title')}
            onBack={onBack}
          />
          <View style={styles.bodyContainer}>{renderSelectAllCheckbox()}</View>
          <NetworkSelectorList
            networks={networks}
            selectedChainIds={selectedChainIds}
            onSelectNetwork={onSelectNetwork}
          ></NetworkSelectorList>
          <View style={styles.bodyContainer}>{renderCtaButtons()}</View>
        </View>
      </SafeAreaView>
    ),
    [
      networks,
      onSelectNetwork,
      renderCtaButtons,
      selectedChainIds,
      styles.bodyContainer,
      styles.bottomSheetContainer,
      onBack,
      renderSelectAllCheckbox,
    ],
  );
  return renderNetworkConnectMultiSelector();
};

export default NetworkConnectMultiSelector;
