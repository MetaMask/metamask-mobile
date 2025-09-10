import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getPermissions } from '../../../../selectors/snaps/permissionController';
import { RootState } from '../../../../reducers';
import { getRequestedCaip25CaveatValue } from '../../AccountConnect/utils';
import { useAccountGroupsForPermissions } from '../../../hooks/useAccountGroupsForPermissions/useAccountGroupsForPermissions';
import {
  getAllScopesFromCaip25CaveatValue,
  getCaipAccountIdsFromCaip25CaveatValue,
  Caip25EndowmentPermissionName,
  Caip25CaveatType,
  setChainIdsInCaip25CaveatValue,
  setNonSCACaipAccountIdsInCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { useTheme } from '../../../../util/theme';
import Routes from '../../../../constants/navigation/Routes';
import MultichainPermissionsSummary from '../MultichainPermissionsSummary/MultichainPermissionsSummary';
import MultichainAccountConnectMultiSelector from '../MultichainAccountConnect/MultichainAccountConnectMultiSelector/MultichainAccountConnectMultiSelector';
import { strings } from '../../../../../locales/i18n';
import NetworkConnectMultiSelector from '../../NetworkConnect/NetworkConnectMultiSelector/NetworkConnectMultiSelector';
import { CaipChainId } from '@metamask/utils';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts.type';
import { AccountGroupId } from '@metamask/account-api';
import { getNetworkImageSource } from '../../../../util/networks';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController';
import { NetworkAvatarProps } from '../../AccountConnect/AccountConnect.types';
import Engine from '../../../../core/Engine';
import { getCaip25AccountFromAccountGroupAndScope } from '../../../../util/multichain/getCaip25AccountFromAccountGroupAndScope';

export interface MultichainAccountPermissionsProps {
  route: {
    params: {
      hostInfo: {
        metadata: { origin: string };
      };
    };
  };
}

export enum MultichainAccountPermissionsScreens {
  Connected = 'Connected',
  EditAccountsPermissions = 'EditAccountsPermissions',
  ConnectMoreNetworks = 'ConnectMoreNetworks',
}

export const MultichainAccountPermissions = (
  props: MultichainAccountPermissionsProps,
) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { hostInfo } = props.route.params;
  const [screen, setScreen] = useState<MultichainAccountPermissionsScreens>(
    MultichainAccountPermissionsScreens.Connected,
  );

  const existingPermissionsForHost = useSelector((state: RootState) =>
    getPermissions(state, hostInfo?.metadata?.origin),
  );

  const existingPermissionsCaip25CaveatValue = useMemo(
    () =>
      getRequestedCaip25CaveatValue(
        existingPermissionsForHost,
        hostInfo?.metadata?.origin,
      ),
    [existingPermissionsForHost, hostInfo?.metadata?.origin],
  );

  const requestedCaipAccountIds = useMemo(
    () =>
      getCaipAccountIdsFromCaip25CaveatValue(
        existingPermissionsCaip25CaveatValue,
      ),
    [existingPermissionsCaip25CaveatValue],
  );

  const requestedCaipChainIds = useMemo(
    () =>
      getAllScopesFromCaip25CaveatValue(existingPermissionsCaip25CaveatValue),
    [existingPermissionsCaip25CaveatValue],
  );

  const { connectedAccountGroups, supportedAccountGroups } =
    useAccountGroupsForPermissions(
      existingPermissionsCaip25CaveatValue,
      requestedCaipAccountIds,
      requestedCaipChainIds,
      [],
    );

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const [selectedAccountGroupIds, setSelectedAccountGroupIds] = useState<
    AccountGroupId[]
  >(() => connectedAccountGroups.map((group) => group.id));

  const [selectedChainIds, setSelectedChainIds] = useState<CaipChainId[]>(
    requestedCaipChainIds,
  );

  const networkAvatars: NetworkAvatarProps[] = useMemo(
    () =>
      selectedChainIds.map((selectedChainId) => ({
        size: AvatarSize.Xs,
        name: networkConfigurations[selectedChainId]?.name || '',
        imageSource: getNetworkImageSource({ chainId: selectedChainId }),
        variant: AvatarVariant.Network,
        caipChainId: selectedChainId,
      })),
    [networkConfigurations, selectedChainIds],
  );

  const handleOnCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOnEdit = useCallback(() => {
    setScreen(MultichainAccountPermissionsScreens.EditAccountsPermissions);
  }, []);

  const handleOnEditNetworks = useCallback(() => {
    setScreen(MultichainAccountPermissionsScreens.ConnectMoreNetworks);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      // Get selected account groups
      const selectedAccountGroups = supportedAccountGroups.filter((group) =>
        selectedAccountGroupIds.includes(group.id),
      );

      // Generate CAIP account IDs from selected account groups and chain IDs
      const selectedCaipAccountIds = getCaip25AccountFromAccountGroupAndScope(
        selectedAccountGroups,
        selectedChainIds,
      );

      // Get the existing caveat value
      const existingCaveat = existingPermissionsCaip25CaveatValue;
      if (!existingCaveat) {
        throw new Error('No existing permissions found');
      }

      // Update the caveat value with new chain IDs
      const caveatValueWithChainIds = setChainIdsInCaip25CaveatValue(
        existingCaveat,
        selectedChainIds,
      );

      // Update the caveat value with new account IDs
      const updatedCaveatValue = setNonSCACaipAccountIdsInCaip25CaveatValue(
        caveatValueWithChainIds,
        selectedCaipAccountIds,
      );

      // Update the permissions
      await Engine.context.PermissionController.updateCaveat(
        hostInfo?.metadata?.origin,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
        updatedCaveatValue,
      );

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error updating permissions:', error);
      // TODO: Show error to user
    }
  }, [
    supportedAccountGroups,
    selectedAccountGroupIds,
    selectedChainIds,
    existingPermissionsCaip25CaveatValue,
    hostInfo?.metadata?.origin,
    navigation,
  ]);

  const handleRevokeAll = useCallback(async () => {
    try {
      const origin = hostInfo?.metadata?.origin;
      if (!origin) {
        throw new Error('No origin found');
      }

      // Check if permissions exist before trying to revoke them
      const hasPermissions =
        await Engine.context.PermissionController.hasPermissions(origin);

      if (hasPermissions) {
        // Try both methods to ensure permissions are revoked
        try {
          // Method 1: Revoke all permissions
          await Engine.context.PermissionController.revokeAllPermissions(
            origin,
          );
        } catch (revokeAllError) {
          // If revokeAllPermissions fails, try the specific method
          console.warn(
            'revokeAllPermissions failed, trying specific permission revocation:',
            revokeAllError,
          );
        }

        // Method 2: Specifically revoke CAIP-25 permission if it exists
        if (
          existingPermissionsForHost &&
          existingPermissionsForHost[Caip25EndowmentPermissionName]
        ) {
          try {
            await Engine.context.PermissionController.revokePermissions({
              [origin]: [Caip25EndowmentPermissionName],
            });
          } catch (revokeSpecificError) {
            console.warn(
              'Failed to revoke specific CAIP-25 permission:',
              revokeSpecificError,
            );
          }
        }
      }

      // Navigate to browser tab instead of going back to MultichainAccountPermissions
      navigation.navigate(Routes.BROWSER.HOME);
    } catch (error) {
      console.error('Error in handleRevokeAll:', error);
      // Still navigate to browser tab even if there's an error
      navigation.navigate(Routes.BROWSER.HOME);
    }
  }, [hostInfo?.metadata?.origin, existingPermissionsForHost, navigation]);

  const handleAccountGroupsSelected = useCallback(
    (newSelectedAccountGroupIds: AccountGroupId[]) => {
      // If no accounts are selected, this means disconnect all was triggered
      if (newSelectedAccountGroupIds.length === 0) {
        handleRevokeAll();
        return;
      }

      const updatedSelectedChains = [...selectedChainIds];
      const selectedGroupIds = new Set(newSelectedAccountGroupIds);
      const selectedAccountGroups = supportedAccountGroups.filter(
        (group: AccountGroupWithInternalAccounts) =>
          selectedGroupIds.has(group.id),
      );

      setSelectedChainIds(updatedSelectedChains);
      setSelectedAccountGroupIds(
        selectedAccountGroups.map(
          (group: AccountGroupWithInternalAccounts) => group.id,
        ),
      );
      setScreen(MultichainAccountPermissionsScreens.Connected);
    },
    [selectedChainIds, supportedAccountGroups, handleRevokeAll],
  );

  const handleNetworksSelected = useCallback(
    (newSelectedChainIds: CaipChainId[]) => {
      setSelectedChainIds(newSelectedChainIds);
      setScreen(MultichainAccountPermissionsScreens.Connected);
    },
    [setSelectedChainIds, setScreen],
  );

  const renderConnectedScreen = useCallback(
    () => (
      <MultichainPermissionsSummary
        currentPageInformation={{
          currentEnsName: '',
          icon: '',
          url: props?.route?.params?.hostInfo?.metadata?.origin,
        }}
        selectedAccountGroupIds={selectedAccountGroupIds}
        networkAvatars={networkAvatars}
        onCancel={handleOnCancel}
        onEdit={handleOnEdit}
        onEditNetworks={handleOnEditNetworks}
        onConfirm={handleConfirm}
        onRevokeAll={handleRevokeAll}
      />
    ),
    [
      selectedAccountGroupIds,
      networkAvatars,
      handleOnCancel,
      handleOnEdit,
      handleOnEditNetworks,
      handleConfirm,
      handleRevokeAll,
      props?.route?.params?.hostInfo?.metadata?.origin,
    ],
  );

  const renderEditAccountScreen = useCallback(
    () => (
      <MultichainAccountConnectMultiSelector
        accountGroups={supportedAccountGroups}
        defaultSelectedAccountGroupIds={selectedAccountGroupIds}
        onSubmit={handleAccountGroupsSelected}
        isLoading={false}
        onBack={() => {
          setScreen(MultichainAccountPermissionsScreens.Connected);
        }}
        hostname={hostInfo?.metadata?.origin}
        screenTitle={strings('accounts.edit_accounts_title')}
        showDisconnectAllButton
        onUserAction={() => {
          // TODO: Implement user action handler
        }}
        isRenderedAsBottomSheet={false}
      />
    ),
    [
      selectedAccountGroupIds,
      handleAccountGroupsSelected,
      hostInfo?.metadata?.origin,
      supportedAccountGroups,
    ],
  );

  const renderNetworkSelectorScreen = useCallback(() => {
    const networkSelectorWrapperStyle = {
      flex: 1,
      backgroundColor: colors.background.default,
    };

    return (
      <View style={networkSelectorWrapperStyle}>
        <NetworkConnectMultiSelector
          onSubmit={handleNetworksSelected}
          isLoading={false}
          hostname={hostInfo?.metadata?.origin}
          onBack={() =>
            setScreen(MultichainAccountPermissionsScreens.Connected)
          }
          defaultSelectedChainIds={selectedChainIds}
        />
      </View>
    );
  }, [
    selectedChainIds,
    handleNetworksSelected,
    hostInfo?.metadata?.origin,
    colors.background.default,
  ]);

  const renderScreen = useCallback(() => {
    switch (screen) {
      case MultichainAccountPermissionsScreens.EditAccountsPermissions:
        return renderEditAccountScreen();
      case MultichainAccountPermissionsScreens.ConnectMoreNetworks:
        return renderNetworkSelectorScreen();
      case MultichainAccountPermissionsScreens.Connected:
      default:
        return renderConnectedScreen();
    }
  }, [
    screen,
    renderConnectedScreen,
    renderEditAccountScreen,
    renderNetworkSelectorScreen,
  ]);

  return <>{renderScreen()}</>;
};
