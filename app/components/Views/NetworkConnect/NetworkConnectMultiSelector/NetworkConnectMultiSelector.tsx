// Third party dependencies.
import React, { useCallback, useState, useEffect } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useSelector } from 'react-redux';
// External dependencies.
import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';

import { useStyles } from '../../../../component-library/hooks';
import HelpText, {
  HelpTextSeverity,
} from '../../../../component-library/components/Form/HelpText';

// Internal dependencies.
import styleSheet from './NetworkConnectMultiSelector.styles';
import { NetworkConnectMultiSelectorProps } from './NetworkConnectMultiSelector.types';
import Checkbox from '../../../../component-library/components/Checkbox';
import NetworkSelectorList from '../../../UI/NetworkSelectorList/NetworkSelectorList';
import {
  EvmAndMultichainNetworkConfigurationsWithCaipChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../util/networks';
import { ConnectedAccountsSelectorsIDs } from '../../AccountConnect/ConnectedAccountModal.testIds';
import { NetworkConnectMultiSelectorSelectorsIDs } from '../NetworkConnectMultiSelector.testIds';

import { CaipChainId } from '@metamask/utils';

const NetworkConnectMultiSelector = ({
  isLoading,
  onSubmit,
  hostname,
  onBack,
  isRenderedAsBottomSheet = true,
  defaultSelectedChainIds,
}: NetworkConnectMultiSelectorProps) => {
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });
  const [selectedChainIds, setSelectedChainIds] = useState<CaipChainId[]>(
    defaultSelectedChainIds,
  );
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  useEffect(() => {
    setSelectedChainIds(defaultSelectedChainIds);
  }, [defaultSelectedChainIds]);

  const handleUpdateNetworkPermissions = useCallback(async () => {
    onSubmit(selectedChainIds);
  }, [onSubmit, selectedChainIds]);
  // TODO: [SOLANA]  When we support non evm networks, refactor this
  const networks = Object.entries(networkConfigurations).map(
    ([key, network]: [
      string,
      EvmAndMultichainNetworkConfigurationsWithCaipChainId,
    ]) => ({
      id: key,
      name: network.name,
      isSelected: false,
      imageSource: getNetworkImageSource({
        chainId: network.caipChainId,
      }),
      caipChainId: network.caipChainId,
    }),
  );

  const onSelectNetwork = useCallback(
    (chainId: CaipChainId) => {
      if (selectedChainIds.includes(chainId)) {
        setSelectedChainIds(
          selectedChainIds.filter((_chainId) => _chainId !== chainId),
        );
      } else {
        setSelectedChainIds([...selectedChainIds, chainId]);
      }
    },
    [selectedChainIds, setSelectedChainIds],
  );

  const areAllNetworksSelected = networks.every(({ caipChainId }) =>
    selectedChainIds.includes(caipChainId),
  );
  const areAnyNetworksSelected = selectedChainIds.length > 0;
  const areNoNetworksSelected = !areAnyNetworksSelected;

  const renderSelectAllCheckbox = useCallback((): React.JSX.Element | null => {
    const areSomeNetworksSelectedButNotAll =
      areAnyNetworksSelected && !areAllNetworksSelected;

    const selectAll = () => {
      if (isLoading) return;
      const allSelectedChainIds = networks.map(
        ({ caipChainId }) => caipChainId,
      );
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
                ...(isLoading && styles.disabledOpacity),
              }}
              disabled={isLoading}
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
                onPress={handleUpdateNetworkPermissions}
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
      isLoading,
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
