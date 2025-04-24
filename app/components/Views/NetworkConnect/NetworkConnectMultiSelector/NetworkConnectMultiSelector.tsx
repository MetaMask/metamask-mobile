// Third party dependencies.
import React, { useCallback, useState, useEffect } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NetworkConfiguration } from '@metamask/network-controller';
import { isEqual } from 'lodash';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
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

// Internal dependencies.
import styleSheet from './NetworkConnectMultiSelector.styles';
import { NetworkConnectMultiSelectorProps } from './NetworkConnectMultiSelector.types';
import Routes from '../../../../constants/navigation/Routes';
import Checkbox from '../../../../component-library/components/Checkbox';
import NetworkSelectorList from '../../../UI/NetworkSelectorList/NetworkSelectorList';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../selectors/networkController';
import Engine from '../../../../core/Engine';
import { getNetworkImageSource } from '../../../../util/networks';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { NetworkConnectMultiSelectorSelectorsIDs } from '../../../../../e2e/selectors/Browser/NetworkConnectMultiSelector.selectors';
import Logger from '../../../../util/Logger';
import {
  updatePermittedChains,
  getCaip25Caveat,
} from '../../../../core/Permissions';
import { getPermittedEthChainIds } from '@metamask/chain-agnostic-permission';
import { toHex } from '@metamask/controller-utils';

const NetworkConnectMultiSelector = ({
  isLoading,
  onUserAction,
  urlWithProtocol,
  hostname,
  onBack,
  isRenderedAsBottomSheet = true,
  onNetworksSelected,
  initialChainId,
  selectedChainIds: propSelectedChainIds,
  isInitializedWithPermittedChains = true,
}: NetworkConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });
  const { navigate } = useNavigation();
  const [selectedChainIds, setSelectedChainIds] = useState<string[]>([]);
  const [originalChainIds, setOriginalChainIds] = useState<string[]>([]);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const currentChainId = useSelector(selectEvmChainId);

  useEffect(() => {
    if (propSelectedChainIds && !isInitializedWithPermittedChains) {
      setSelectedChainIds(propSelectedChainIds);
      setOriginalChainIds(propSelectedChainIds);
    }
  }, [propSelectedChainIds, isInitializedWithPermittedChains]);

  useEffect(() => {
    if (!isInitializedWithPermittedChains) return;

    let currentlyPermittedChains: string[] = [];
    try {
      const caveat = getCaip25Caveat(hostname);
      currentlyPermittedChains = caveat
        ? getPermittedEthChainIds(caveat.value)
        : [];
    } catch (e) {
      Logger.error(e as Error, 'Error getting permitted chains caveat');
    }

    if (currentlyPermittedChains.length === 0 && initialChainId) {
      currentlyPermittedChains = [initialChainId];
    }

    setSelectedChainIds(currentlyPermittedChains);
    setOriginalChainIds(currentlyPermittedChains);
  }, [hostname, isInitializedWithPermittedChains, initialChainId]);

  const handleUpdateNetworkPermissions = useCallback(async () => {
    if (onNetworksSelected) {
      onNetworksSelected(selectedChainIds);
    } else {
      // Check if current network was originally permitted and is now being removed
      const wasCurrentNetworkOriginallyPermitted =
        originalChainIds.includes(currentChainId);
      const isCurrentNetworkStillPermitted =
        selectedChainIds.includes(currentChainId);

      if (
        wasCurrentNetworkOriginallyPermitted &&
        !isCurrentNetworkStillPermitted
      ) {
        // Find the network configuration for the first permitted chain
        const networkToSwitch = Object.entries(networkConfigurations).find(
          ([, { chainId }]) => chainId === selectedChainIds[0],
        );

        if (networkToSwitch) {
          const [, config] = networkToSwitch;
          const { rpcEndpoints, defaultRpcEndpointIndex } = config;
          const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];

          // Switch to the network using networkClientId
          await Engine.context.MultichainNetworkController.setActiveNetwork(
            networkClientId,
          );
        }
      }

      const hexSelectedChainIds = selectedChainIds.map(toHex);
      const removeExistingChainPermissions = true;
      updatePermittedChains(hostname, hexSelectedChainIds, removeExistingChainPermissions);
      onUserAction(USER_INTENT.Confirm);
    }
  }, [
    selectedChainIds,
    originalChainIds,
    hostname,
    onUserAction,
    onNetworksSelected,
    currentChainId,
    networkConfigurations,
  ]);
  // TODO: [SOLANA]  When we support non evm networks, refactor this
  const networks = Object.entries(networkConfigurations).map(
    ([key, network]: [string, NetworkConfiguration]) => ({
      id: key,
      name: network.name,
      rpcUrl: network.rpcEndpoints[network.defaultRpcEndpointIndex].url,
      isSelected: false,
      //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
      imageSource: getNetworkImageSource({
        chainId: network?.chainId,
      }),
    }),
  );

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
      setSelectedChainIds(newNetworkList);
    },
    [networks, selectedChainIds],
  );

  const onRevokeAllHandler = useCallback(async () => {
    await Engine.context.PermissionController.revokeAllPermissions(hostname);
    navigate('PermissionsManager');
  }, [hostname, navigate]);

  const toggleRevokeAllNetworkPermissionsModal = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS,
      params: {
        hostInfo: {
          metadata: {
            origin: urlWithProtocol && new URL(urlWithProtocol).hostname,
          },
        },
        onRevokeAll: !isRenderedAsBottomSheet && onRevokeAllHandler,
      },
    });
  }, [navigate, urlWithProtocol, isRenderedAsBottomSheet, onRevokeAllHandler]);

  const areAllNetworksSelected = networks
    .map(({ id }) => id)
    .every((id) => selectedChainIds?.includes(id));
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
          testID={ConnectedAccountsSelectorsIDs.SELECT_ALL_NETWORKS_BUTTON}
          accessibilityLabel={
            ConnectedAccountsSelectorsIDs.SELECT_ALL_NETWORKS_BUTTON
          }
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

  const isUpdateDisabled =
    selectedChainIds.length === 0 ||
    isLoading ||
    isEqual(selectedChainIds, originalChainIds);

  const renderCtaButtons = useCallback(
    () => (
      <View style={styles.buttonsContainer}>
        <View style={styles.updateButtonContainer}>
          {areAnyNetworksSelected && (
            <Button
              variant={ButtonVariants.Primary}
              label={strings('networks.update')}
              onPress={handleUpdateNetworkPermissions}
              testID={
                NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS
              }
              size={ButtonSize.Lg}
              style={{
                ...styles.buttonPositioning,
                ...(isUpdateDisabled && styles.disabledOpacity),
              }}
              disabled={isUpdateDisabled}
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
                testID={
                  ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON
                }
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
    ),
    [
      handleUpdateNetworkPermissions,
      areAnyNetworksSelected,
      styles,
      areNoNetworksSelected,
      hostname,
      toggleRevokeAllNetworkPermissionsModal,
      isUpdateDisabled,
    ],
  );

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
