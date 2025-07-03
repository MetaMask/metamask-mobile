// Third party dependencies.
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { isEqual, uniq } from 'lodash';
import { useNavigation } from '@react-navigation/native';
import { NON_EVM_TESTNET_IDS } from '@metamask/multichain-network-controller';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Engine from '../../../core/Engine';
import {
  addPermittedAccounts,
  updatePermittedChains,
  getCaip25Caveat,
<<<<<<< HEAD
  getPermittedCaipAccountIdsByHostname,
  removePermittedAccounts,
  getPermittedCaipChainIdsByHostname,
  sortMultichainAccountsByLastSelected,
=======
  getPermittedAccountsByHostname,
  removePermittedAccounts,
  getPermittedChainIdsByHostname,
>>>>>>> stable
} from '../../../core/Permissions';
import AccountConnectMultiSelector from '../AccountConnect/AccountConnectMultiSelector';
import NetworkConnectMultiSelector from '../NetworkConnect/NetworkConnectMultiSelector';
import Logger from '../../../util/Logger';
import { useStyles } from '../../../component-library/hooks';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { ToastOptions } from '../../../component-library/components/Toast/Toast.types';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAccounts, Account } from '../../hooks/useAccounts';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import { getActiveTabUrl } from '../../../util/transactions';
import { strings } from '../../../../locales/i18n';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
<<<<<<< HEAD
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../selectors/networkController';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
=======
import { selectEvmChainId, selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
>>>>>>> stable

// Internal dependencies.
import {
  AccountPermissionsProps,
  AccountPermissionsScreens,
} from './AccountPermissions.types';
import AccountPermissionsConnected from './AccountPermissionsConnected';
import { USER_INTENT } from '../../../constants/permissions';
import useFavicon from '../../hooks/useFavicon/useFavicon';
import URLParse from 'url-parse';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { selectPermissionControllerState } from '../../../selectors/snaps/permissionController';
import { RootState } from '../../../reducers';
import {
  getNetworkImageSource,
  isPerDappSelectedNetworkEnabled,
} from '../../../util/networks';
import PermissionsSummary from '../../../components/UI/PermissionsSummary';
import { PermissionsSummaryProps } from '../../../components/UI/PermissionsSummary/PermissionsSummary.types';
<<<<<<< HEAD
import {
  AvatarVariant,
  AvatarSize,
} from '../../../component-library/components/Avatars/Avatar';
import NetworkPermissionsConnected from './NetworkPermissionsConnected';
import {
  getAllScopesFromCaip25CaveatValue,
  isCaipAccountIdInPermittedAccountIds,
} from '@metamask/chain-agnostic-permission';
import {
  CaipAccountId,
  CaipChainId,
  hasProperty,
  KnownCaipNamespace,
  parseCaipAccountId,
} from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import { parseChainId } from '@walletconnect/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import { NetworkAvatarProps } from '../AccountConnect/AccountConnect.types';
import styleSheet from './AccountPermissions.styles';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import AddNewAccount from '../AddNewAccount';
import { trace, endTrace, TraceName } from '../../../util/trace';

const AccountPermissions = (props: AccountPermissionsProps) => {
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, {});
=======
import { toChecksumHexAddress, toHex } from '@metamask/controller-utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar';
import NetworkPermissionsConnected from './NetworkPermissionsConnected';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { getPermittedEthChainIds } from '@metamask/chain-agnostic-permission';
import { Hex } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import { areAddressesEqual } from '../../../util/address';

const AccountPermissions = (props: AccountPermissionsProps) => {
  const { navigate } = useNavigation();
>>>>>>> stable
  const { trackEvent, createEventBuilder } = useMetrics();
  const {
    hostInfo: {
      metadata: { origin: hostname },
    },
    isRenderedAsBottomSheet = true,
    initialScreen = AccountPermissionsScreens.Connected,
    isNonDappNetworkSwitch = false,
  } = props.route.params;
  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const accountsLength = useSelector(selectAccountsLength);
<<<<<<< HEAD
  const currentEvmChainId = useSelector(selectEvmChainId);
  const networkInfo = useNetworkInfo(hostname);
=======
  const currentChainId = useSelector(selectEvmChainId);

>>>>>>> stable
  const nonTestnetNetworks = useSelector(
    (state: RootState) =>
      Object.keys(selectEvmNetworkConfigurationsByChainId(state)).length + 1,
  );

  const origin: string = useSelector(getActiveTabUrl, isEqual);
  const faviconSource = useFavicon(origin);
  // TODO - Once we can pass metadata to permission system, pass origin instead of hostname into this component.
  // const hostname = useMemo(() => new URL(origin).hostname, [origin]);
  const secureIcon = useMemo(
    () =>
      (getUrlObj(origin) as URLParse<string>).protocol === 'https:'
        ? IconName.Lock
        : IconName.LockSlash,
    [origin],
  );

  const urlWithProtocol = prefixUrlWithProtocol(hostname);

  const { toastRef } = useContext(ToastContext);
  const [isLoading, setIsLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const permittedAccountsList = useSelector(selectPermissionControllerState);
<<<<<<< HEAD
  const nonRemappedPermittedAccounts = getPermittedCaipAccountIdsByHostname(
    permittedAccountsList,
    hostname,
  );
  const permittedCaipAccountIds = useMemo(() => {
    const unsortedPermittedAccounts = uniq(
      nonRemappedPermittedAccounts.map((caipAccountId) => {
        const {
          address,
          chain: { namespace },
        } = parseCaipAccountId(caipAccountId);
        if (namespace === KnownCaipNamespace.Eip155) {
          // this is very hacky, but it works for now
          return `eip155:0:${address}` as CaipAccountId;
        }
        return caipAccountId;
      }),
    );

    return sortMultichainAccountsByLastSelected(unsortedPermittedAccounts);
  }, [nonRemappedPermittedAccounts]);

  const permittedCaipChainIds = getPermittedCaipChainIdsByHostname(
=======
  const permittedAccounts = getPermittedAccountsByHostname(
    permittedAccountsList,
    hostname,
  );
  const permittedChainIds = getPermittedChainIdsByHostname(
>>>>>>> stable
    permittedAccountsList,
    hostname,
  );

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const sheetRef = useRef<BottomSheetRef>(null);
  const [permissionsScreen, setPermissionsScreen] =
    useState<AccountPermissionsScreens>(
      isNonDappNetworkSwitch
        ? AccountPermissionsScreens.PermissionsSummary
        : initialScreen,
    );
  const { accounts, ensByAccountAddress } = useAccounts({
    isLoading,
  });
<<<<<<< HEAD
  const previousPermittedAccounts = useRef<CaipAccountId[]>();
=======
  const previousPermittedAccounts = useRef<string[]>();
>>>>>>> stable

  const [userIntent, setUserIntent] = useState(USER_INTENT.None);
  const [networkSelectorUserIntent, setNetworkSelectorUserIntent] = useState(
    USER_INTENT.None,
  );

<<<<<<< HEAD
  const [multichainAccountOptions, setMultichainAccountOptions] = useState<
    | {
        clientType?: WalletClientType;
        scope?: CaipChainId;
      }
    | undefined // undefined is used for evm account creation.
  >(undefined);

  const networks = Object.values(networkConfigurations).map((network) => ({
    name: network.name,
    caipChainId: network.caipChainId,
    imageSource: getNetworkImageSource({
      chainId: network.caipChainId,
    }),
  }));

  const networkAvatars: NetworkAvatarProps[] = permittedCaipChainIds.map(
    (selectedId) => {
      const network = networks
        .filter(
          (currentNetwork) =>
            !NON_EVM_TESTNET_IDS.includes(currentNetwork.caipChainId),
        )
        .find(({ caipChainId }) => caipChainId === selectedId);
      let imageSource = network?.imageSource;

      if (typeof imageSource === 'string') {
        imageSource = imageSource ? { uri: imageSource } : {};
      }

      if (!imageSource) {
        imageSource = {};
      }

      return {
        name: network?.name || '',
        imageSource,
        variant: AvatarVariant.Network,
        size: AvatarSize.Xs,
        caipChainId: selectedId,
      };
    },
  );
=======
  const networks = Object.entries(networkConfigurations)
    .filter(([_, network]) => !isNonEvmChainId(network.chainId))
    .map(([key, network]: [string, NetworkConfiguration]) => ({
      id: key,
      name: network.name,
      rpcUrl: network.rpcEndpoints[network.defaultRpcEndpointIndex].url,
      isSelected: false,
      chainId: network?.chainId,
      imageSource: getNetworkImageSource({
        chainId: network?.chainId,
      }),
    }));

  const networkAvatars: ({ name: string; imageSource: string } | null)[] =
    permittedChainIds.map((selectedId) => {
      const network = networks.find(({ id }) => id === selectedId);
      if (network) {
        return {
          name: network.name,
          imageSource: network.imageSource as string,
          variant: AvatarVariant.Network,
        };
      }
      return null;
    });

>>>>>>> stable

  const hideSheet = useCallback(
    (callback?: () => void) =>
      sheetRef?.current?.onCloseBottomSheet?.(callback),
    [sheetRef],
  );
  const metricsSource = 'Browser Tab/Permission UI';

  // Checks if anymore accounts are connected to the dapp. Auto dismiss sheet if none are connected.
  useEffect(() => {
    if (
      previousPermittedAccounts.current === undefined &&
<<<<<<< HEAD
      permittedCaipAccountIds.length === 0
=======
      permittedAccounts.length === 0
>>>>>>> stable
    ) {
      hideSheet();

      const networkToastProps: ToastOptions = {
        variant: ToastVariants.Network,
        labelOptions: [
          {
            label: strings('toast.disconnected_from', {
              dappHostName: hostname,
            }),
          },
        ],
        hasNoTimeout: false,
        networkImageSource: faviconSource,
      };

      toastRef?.current?.showToast(networkToastProps);

<<<<<<< HEAD
      previousPermittedAccounts.current = permittedCaipAccountIds;
    }
  }, [
    permittedCaipAccountIds,
=======
      previousPermittedAccounts.current = permittedAccounts;
    }
  }, [
    permittedAccounts,
>>>>>>> stable
    hideSheet,
    toastRef,
    hostname,
    faviconSource,
    isRenderedAsBottomSheet,
  ]);

  const accountsFilteredByPermissions = useMemo(() => {
    const accountsByPermittedStatus: Record<
      'permitted' | 'unpermitted',
      Account[]
    > = {
      permitted: [],
      unpermitted: [],
    };

    accounts.forEach((account) => {
<<<<<<< HEAD
      if (
        isCaipAccountIdInPermittedAccountIds(
          account.caipAccountId,
          permittedCaipAccountIds,
        )
      ) {
=======
      const isPermitted = permittedAccounts.some((permittedAccount) =>
        areAddressesEqual(account.address, permittedAccount),
      );

      if (isPermitted) {
>>>>>>> stable
        accountsByPermittedStatus.permitted.push(account);
      } else {
        accountsByPermittedStatus.unpermitted.push(account);
      }
    });

    return accountsByPermittedStatus;
<<<<<<< HEAD
  }, [accounts, permittedCaipAccountIds]);
=======
  }, [accounts, permittedAccounts]);
>>>>>>> stable

  const onRevokeAllHandler = useCallback(async () => {
    await Engine.context.PermissionController.revokeAllPermissions(hostname);
    navigate('PermissionsManager');
  }, [hostname, navigate]);

  const toggleRevokeAllPermissionsModal = useCallback(() => {
<<<<<<< HEAD
    trace({ name: TraceName.DisconnectAllAccountPermissions });
=======
>>>>>>> stable
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
<<<<<<< HEAD
    endTrace({ name: TraceName.DisconnectAllAccountPermissions });
=======
>>>>>>> stable
  }, [navigate, urlWithProtocol, isRenderedAsBottomSheet, onRevokeAllHandler]);

  const handleCreateAccount = useCallback(
    (clientType?: WalletClientType, scope?: CaipChainId) => {
      setMultichainAccountOptions({
        clientType,
        scope,
      });
      setPermissionsScreen(AccountPermissionsScreens.AddAccount);
    },
    [],
  );

<<<<<<< HEAD
  const handleAccountCreationComplete = useCallback(async () => {
=======
  const handleSelectChainIds = useCallback(async (chainIds: string[]) => {
    if (chainIds.length === 0) {
      toggleRevokeAllPermissionsModal();
      return;
    }

      // Check if current network was originally permitted and is now being removed
      const wasCurrentNetworkOriginallyPermitted =
        permittedChainIds.includes(currentChainId);
      const isCurrentNetworkStillPermitted =
        chainIds.includes(currentChainId);

      if (
        wasCurrentNetworkOriginallyPermitted &&
        !isCurrentNetworkStillPermitted
      ) {
        // Find the network configuration for the first permitted chain
        const networkToSwitch = Object.entries(networkConfigurations).find(
          ([, { chainId }]) => chainId === chainIds[0],
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

      const hexSelectedChainIds = chainIds.map(toHex);
      const removeExistingChainPermissions = true;
      updatePermittedChains(hostname, hexSelectedChainIds, removeExistingChainPermissions);
      setNetworkSelectorUserIntent(USER_INTENT.Confirm);
  }, [
    currentChainId,
    hostname,
    networkConfigurations,
    permittedChainIds,
    toggleRevokeAllPermissionsModal
  ]);

  const handleSelectAccountAddresses = useCallback((selectedAccounts: string[], newUserIntent: USER_INTENT) => {
>>>>>>> stable
    try {
      if (selectedAccounts.length === 0) {
        toggleRevokeAllPermissionsModal();
        return;
      }

      setIsLoading(true);
<<<<<<< HEAD
=======
      let newActiveAddress;
      let connectedAccountLength = 0;
      let removedAccountCount = 0;

      // Function to normalize Ethereum addresses using checksum
      const normalizeAddresses = (addresses: string[]) =>
        addresses.map((address) => toChecksumHexAddress(address));

      // Normalize permitted accounts and selected addresses to checksummed format
      const normalizedPermittedAccounts = normalizeAddresses(permittedAccounts);
      const normalizedSelectedAddresses = normalizeAddresses(selectedAccounts);

      let accountsToRemove: Hex[] = [];
      let accountsToAdd: Hex[] = [];

      // Identify accounts to be added
      accountsToAdd = normalizedSelectedAddresses.reduce((result: Hex[], account) => {
        if (!normalizedPermittedAccounts.includes(account)) {
          result.push(toHex(account));
        }
        return result;
      }, []);

      // Add newly selected accounts
      if (accountsToAdd.length > 0) {
        newActiveAddress = addPermittedAccounts(hostname, accountsToAdd);
      } else {
        // If no new accounts were added, set the first selected address as active
        newActiveAddress = normalizedSelectedAddresses[0];
      }

      // Identify accounts to be removed
      accountsToRemove = normalizedPermittedAccounts
        .filter((account) => !normalizedSelectedAddresses.includes(account))
        .map(toHex);
      removedAccountCount = accountsToRemove.length;

      // Remove accounts that are no longer selected
      if (accountsToRemove.length > 0) {
        removePermittedAccounts(hostname, accountsToRemove);
      }

      // Calculate the number of connected accounts after changes
      connectedAccountLength =
        normalizedPermittedAccounts.length +
        accountsToAdd.length -
        accountsToRemove.length;

      const activeAccountName = getAccountNameWithENS({
        accountAddress: newActiveAddress,
        accounts,
        ensByAccountAddress,
      });

      let labelOptions: ToastOptions['labelOptions'] = [];
      // Start of Selection
      if (connectedAccountLength >= 1) {
        labelOptions = [
          { label: `${strings('toast.accounts_permissions_updated')}` },
        ];
      }

      if (connectedAccountLength === 1 && removedAccountCount === 0) {
        labelOptions = [
          { label: `${activeAccountName} `, isBold: true },
          { label: strings('toast.connected_and_active') },
        ];
      }
      toastRef?.current?.showToast({
        variant: ToastVariants.Account,
        labelOptions,
        accountAddress: newActiveAddress,
        accountAvatarType,
        hasNoTimeout: false,
      });
      const totalAccounts = accountsLength;
>>>>>>> stable
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT,
        ).build(),
      );
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: metricsSource,
            number_of_accounts: accounts?.length,
          })
          .build(),
      );
<<<<<<< HEAD
      setPermissionsScreen(AccountPermissionsScreens.ConnectMoreAccounts);
=======
      setUserIntent(newUserIntent);
>>>>>>> stable
    } catch (e) {
      Logger.error(e as Error, 'Error while trying to add a new account.');
    } finally {
      setIsLoading(false);
    }
  }, [
<<<<<<< HEAD
=======
    permittedAccounts,
    accounts,
>>>>>>> stable
    setIsLoading,
    trackEvent,
    createEventBuilder,
<<<<<<< HEAD
    accounts?.length,
    metricsSource,
  ]);

  const handleSelectChainIds = useCallback(
    async (chainIds: CaipChainId[]) => {
      if (chainIds.length === 0) {
        toggleRevokeAllPermissionsModal();
        return;
      }
      const currentEvmCaipChainId: CaipChainId =
        isPerDappSelectedNetworkEnabled()
          ? `eip155:${parseInt(networkInfo.chainId, 16)}`
          : `eip155:${parseInt(currentEvmChainId, 16)}`;

      const newSelectedEvmChainId = chainIds.find((chainId) => {
        const { namespace } = parseChainId(chainId);
        return namespace === KnownCaipNamespace.Eip155;
      });

      // Check if current network was originally permitted and is now being removed
      const wasCurrentNetworkOriginallyPermitted =
        permittedCaipChainIds.includes(currentEvmCaipChainId);
      const isCurrentNetworkStillPermitted = chainIds.includes(
        currentEvmCaipChainId,
      );

      if (
        wasCurrentNetworkOriginallyPermitted &&
        !isCurrentNetworkStillPermitted &&
        newSelectedEvmChainId
      ) {
        // Find the network configuration for the first permitted chain
        const networkToSwitch = Object.entries(networkConfigurations).find(
          ([, { caipChainId }]) => caipChainId === newSelectedEvmChainId,
        );

        if (networkToSwitch) {
          const [, config] = networkToSwitch;
          if (
            !hasProperty(config, 'rpcEndpoints') ||
            !hasProperty(config, 'defaultRpcEndpointIndex')
          ) {
            return;
          }
          const { rpcEndpoints, defaultRpcEndpointIndex } =
            config as NetworkConfiguration;
          const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];

          if (isPerDappSelectedNetworkEnabled()) {
            // For per-dapp network selection, directly set the network for this domain
            Engine.context.SelectedNetworkController.setNetworkClientIdForDomain(
              hostname,
              networkClientId,
            );
          } else {
            // For global network selection, switch the active network
            await Engine.context.MultichainNetworkController.setActiveNetwork(
              networkClientId,
            );
          }
        }
      }

      const removeExistingChainPermissions = true;
      updatePermittedChains(hostname, chainIds, removeExistingChainPermissions);
      setNetworkSelectorUserIntent(USER_INTENT.Confirm);
    },
    [
      currentEvmChainId,
      hostname,
      networkConfigurations,
      permittedCaipChainIds,
      toggleRevokeAllPermissionsModal,
      networkInfo,
    ],
  );

  const handleSelectAccountAddresses = useCallback(
    (selectedAccounts: CaipAccountId[], newUserIntent: USER_INTENT) => {
      try {
        if (selectedAccounts.length === 0) {
          toggleRevokeAllPermissionsModal();
          return;
        }

        setIsLoading(true);

        let accountsToRemove: CaipAccountId[] = [];
        let accountsToAdd: CaipAccountId[] = [];
        let newPermittedAccounts: CaipAccountId[] = [
          ...permittedCaipAccountIds,
        ];

        // Identify accounts to be added
        accountsToAdd = selectedAccounts.filter(
          (account) =>
            !isCaipAccountIdInPermittedAccountIds(
              account,
              permittedCaipAccountIds,
            ),
        );

        if (accountsToAdd.length > 0) {
          addPermittedAccounts(hostname, accountsToAdd);
          newPermittedAccounts = [...newPermittedAccounts, ...accountsToAdd];
        }

        accountsToRemove = permittedCaipAccountIds.filter(
          (account) =>
            !isCaipAccountIdInPermittedAccountIds(account, selectedAccounts),
        );

        if (accountsToRemove.length > 0) {
          const accountsToRemoveHex = accountsToRemove.map((account) => {
            const { address } = parseCaipAccountId(account);
            return address;
          });
          removePermittedAccounts(hostname, accountsToRemoveHex);
          newPermittedAccounts = newPermittedAccounts.filter(
            (account) => !accountsToRemove.includes(account),
          );
        }

        // Calculate the number of connected accounts after changes
        const connectedAccountLength =
          permittedCaipAccountIds.length +
          accountsToAdd.length -
          accountsToRemove.length;

        const labelOptions = [
          { label: `${strings('toast.accounts_permissions_updated')}` },
        ];

        const toastAccount = accountsToAdd[0] ?? newPermittedAccounts[0];

        const { address } = parseCaipAccountId(toastAccount);

        toastRef?.current?.showToast({
          variant: ToastVariants.Account,
          labelOptions,
          accountAddress: address,
          accountAvatarType,
          hasNoTimeout: false,
        });
        const totalAccounts = accountsLength;
        trackEvent(
          createEventBuilder(MetaMetricsEvents.ADD_ACCOUNT_DAPP_PERMISSIONS)
            .addProperties({
              number_of_accounts: totalAccounts,
              number_of_accounts_connected: connectedAccountLength,
              // this only considers EVM networks right now
              number_of_networks: nonTestnetNetworks,
            })
            .build(),
        );
        setUserIntent(newUserIntent);
      } catch (e) {
        Logger.error(e as Error, 'Error while trying to connect to a dApp.');
      } finally {
        setIsLoading(false);
      }
    },
    [
      permittedCaipAccountIds,
      setIsLoading,
      hostname,
      toastRef,
      accountAvatarType,
      accountsLength,
      nonTestnetNetworks,
      trackEvent,
      createEventBuilder,
      toggleRevokeAllPermissionsModal,
    ],
  );

  const handleSelectAccountAddressesFromEditView = useCallback(
    (selectedAccounts: CaipAccountId[]) => {
      handleSelectAccountAddresses(selectedAccounts, USER_INTENT.EditMultiple);
    },
    [handleSelectAccountAddresses],
  );

  const handleSelectAccountAddressesFromConnectMoreView = useCallback(
    (selectedAccounts: CaipAccountId[]) => {
      handleSelectAccountAddresses(selectedAccounts, USER_INTENT.Confirm);
    },
    [handleSelectAccountAddresses],
  );
=======
    toggleRevokeAllPermissionsModal,
  ]);

  const handleSelectAccountAddressesFromEditView = useCallback((selectedAccounts: string[]) => {
    handleSelectAccountAddresses(selectedAccounts, USER_INTENT.EditMultiple);
  }, [handleSelectAccountAddresses]);

  const handleSelectAccountAddressesFromConnectMoreView = useCallback((selectedAccounts: string[]) => {
    handleSelectAccountAddresses(selectedAccounts, USER_INTENT.Confirm);
  }, [handleSelectAccountAddresses]);
>>>>>>> stable

  useEffect(() => {
    if (networkSelectorUserIntent === USER_INTENT.Confirm) {
      if (isNonDappNetworkSwitch) {
        setPermissionsScreen(
          AccountPermissionsScreens.ChooseFromPermittedNetworks,
        );
      } else {
        setPermissionsScreen(AccountPermissionsScreens.PermissionsSummary);
      }

      setNetworkSelectorUserIntent(USER_INTENT.None);
      const networkToastProps: ToastOptions = {
        variant: ToastVariants.Network,
        labelOptions: [
          {
            label: strings('toast.network_permissions_updated'),
          },
        ],
        hasNoTimeout: false,
        networkImageSource: faviconSource,
      };
      toastRef?.current?.showToast(networkToastProps);
    }
  }, [
    networkSelectorUserIntent,
    hideSheet,
    faviconSource,
    toastRef,
    isNonDappNetworkSwitch,
    setNetworkSelectorUserIntent,
<<<<<<< HEAD
    urlWithProtocol,
=======
    urlWithProtocol
>>>>>>> stable
  ]);

  useEffect(() => {
    if (userIntent === USER_INTENT.None) return;
    const handleUserActions = (action: USER_INTENT) => {
      switch (action) {
        case USER_INTENT.Confirm: {
          hideSheet(() => {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
                .addProperties({
                  source: metricsSource,
                  number_of_accounts: accounts?.length,
                })
                .build(),
            );
          });
          break;
        }
        case USER_INTENT.EditMultiple: {
          setPermissionsScreen(AccountPermissionsScreens.PermissionsSummary);
          break;
        }
        case USER_INTENT.Cancel: {
          hideSheet();
          break;
        }
        case USER_INTENT.Import: {
          navigate('ImportPrivateKeyView');
          // Is this where we want to track importing an account or within ImportPrivateKeyView screen?
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
            ).build(),
          );

          break;
        }
        case USER_INTENT.ConnectHW: {
          navigate('ConnectQRHardwareFlow');
          // Is this where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen?
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.CONNECT_HARDWARE_WALLET,
            ).build(),
          );

          break;
        }
      }
    };

    handleUserActions(userIntent);

    setUserIntent(USER_INTENT.None);
  }, [
    navigate,
    userIntent,
    sheetRef,
    hideSheet,
    handleCreateAccount,
    accounts?.length,
    trackEvent,
    createEventBuilder,
  ]);

  const renderAddNewAccount = useCallback(
    ({
      clientType,
      scope,
    }: {
      clientType?: WalletClientType;
      scope?: CaipChainId;
    }) => (
      <AddNewAccount
        scope={scope}
        clientType={clientType}
        onActionComplete={handleAccountCreationComplete}
        onBack={() => {
          setPermissionsScreen(AccountPermissionsScreens.Connected);
        }}
      />
    ),
    [handleAccountCreationComplete],
  );

  const renderConnectedScreen = useCallback(
    () => (
      <AccountPermissionsConnected
        isLoading={isLoading}
        onSetPermissionsScreen={setPermissionsScreen}
        onDismissSheet={hideSheet}
        accounts={accountsFilteredByPermissions.permitted}
        ensByAccountAddress={ensByAccountAddress}
<<<<<<< HEAD
        // This is only okay because permittedCaipAccountIds is sorted by lastSelected already
        selectedAddresses={
          permittedCaipAccountIds.length > 0 ? [permittedCaipAccountIds[0]] : []
        }
=======
        selectedAddresses={permittedAccounts}
>>>>>>> stable
        favicon={faviconSource}
        hostname={hostname}
        urlWithProtocol={urlWithProtocol}
        secureIcon={secureIcon}
        accountAvatarType={accountAvatarType}
      />
    ),
    [
      ensByAccountAddress,
      isLoading,
      accountsFilteredByPermissions,
      setPermissionsScreen,
      hideSheet,
      faviconSource,
      hostname,
      urlWithProtocol,
      secureIcon,
      accountAvatarType,
<<<<<<< HEAD
      permittedCaipAccountIds,
=======
      permittedAccounts,
>>>>>>> stable
    ],
  );

  const renderPermissionsSummaryScreen = useCallback(() => {
<<<<<<< HEAD
=======
    const checksummedPermittedAddresses = permittedAccounts.map(
      toChecksumHexAddress<string>,
    );

>>>>>>> stable
    const permissionsSummaryProps: PermissionsSummaryProps = {
      currentPageInformation: {
        currentEnsName: '',
        icon: faviconSource as string,
        url: urlWithProtocol,
      },
      onEdit: () => {
        setPermissionsScreen(AccountPermissionsScreens.EditAccountsPermissions);
      },
      onEditNetworks: () =>
        setPermissionsScreen(AccountPermissionsScreens.ConnectMoreNetworks),
      onUserAction: setUserIntent,
      showActionButtons: false,
      onBack: () =>
        isRenderedAsBottomSheet
          ? setPermissionsScreen(AccountPermissionsScreens.Connected)
          : navigate('PermissionsManager'),
      isRenderedAsBottomSheet,
      accountAddresses: permittedCaipAccountIds,
      accounts,
      networkAvatars,
      setTabIndex,
      tabIndex,
    };

    return <PermissionsSummary {...permissionsSummaryProps} />;
  }, [
    isRenderedAsBottomSheet,
    navigate,
<<<<<<< HEAD
    permittedCaipAccountIds,
    networkAvatars,
    accounts,
    faviconSource,
    urlWithProtocol,
    setTabIndex,
    tabIndex,
=======
    permittedAccounts,
    networkAvatars,
    accounts,
    faviconSource,
    urlWithProtocol
>>>>>>> stable
  ]);

  const renderEditAccountsPermissionsScreen = useCallback(
    () => (
      <AccountConnectMultiSelector
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
<<<<<<< HEAD
        defaultSelectedAddresses={permittedCaipAccountIds}
=======
        defaultSelectedAddresses={permittedAccounts}
>>>>>>> stable
        onSubmit={handleSelectAccountAddressesFromEditView}
        isLoading={isLoading}
        hostname={hostname}
        isAutoScrollEnabled={false}
        onBack={() =>
          setPermissionsScreen(AccountPermissionsScreens.PermissionsSummary)
        }
        screenTitle={strings('accounts.edit_accounts_title')}
        isRenderedAsBottomSheet={isRenderedAsBottomSheet}
        onCreateAccount={handleCreateAccount}
      />
    ),
    [
      ensByAccountAddress,
<<<<<<< HEAD
      permittedCaipAccountIds,
=======
      permittedAccounts,
>>>>>>> stable
      isLoading,
      hostname,
      isRenderedAsBottomSheet,
      accounts,
      handleSelectAccountAddressesFromEditView,
<<<<<<< HEAD
      handleCreateAccount,
=======
>>>>>>> stable
    ],
  );

  const renderConnectMoreAccountsScreen = useCallback(
    () => (
      <AccountConnectMultiSelector
        accounts={accountsFilteredByPermissions.unpermitted}
        ensByAccountAddress={ensByAccountAddress}
<<<<<<< HEAD
        defaultSelectedAddresses={permittedCaipAccountIds}
=======
        defaultSelectedAddresses={permittedAccounts}
>>>>>>> stable
        onSubmit={handleSelectAccountAddressesFromConnectMoreView}
        isLoading={isLoading}
        hostname={hostname}
        isAutoScrollEnabled={false}
        onBack={() => setPermissionsScreen(AccountPermissionsScreens.Connected)}
        screenTitle={strings('accounts.connect_more_accounts')}
        showDisconnectAllButton={false}
        onCreateAccount={handleCreateAccount}
      />
    ),
    [
      ensByAccountAddress,
      isLoading,
      accountsFilteredByPermissions,
      hostname,
<<<<<<< HEAD
      permittedCaipAccountIds,
      handleSelectAccountAddressesFromConnectMoreView,
      handleCreateAccount,
=======
      permittedAccounts,
      handleSelectAccountAddressesFromConnectMoreView,
>>>>>>> stable
    ],
  );

  const renderConnectNetworksScreen = useCallback(
    () => (
      <NetworkConnectMultiSelector
        onSubmit={handleSelectChainIds}
        isLoading={isLoading}
        hostname={hostname}
        onBack={() =>
          setPermissionsScreen(
            isNonDappNetworkSwitch
              ? AccountPermissionsScreens.ChooseFromPermittedNetworks
              : AccountPermissionsScreens.PermissionsSummary,
          )
        }
        isRenderedAsBottomSheet={isRenderedAsBottomSheet}
<<<<<<< HEAD
        defaultSelectedChainIds={permittedCaipChainIds}
=======
        defaultSelectedChainIds={permittedChainIds}
>>>>>>> stable
      />
    ),
    [
      isLoading,
      hostname,
      isRenderedAsBottomSheet,
      isNonDappNetworkSwitch,
      handleSelectChainIds,
<<<<<<< HEAD
      permittedCaipChainIds,
=======
      permittedChainIds
    ],
  );

  const renderRevokeScreen = useCallback(
    () => (
      <AccountPermissionsRevoke
        accounts={accountsFilteredByPermissions.permitted}
        onSetPermissionsScreen={setPermissionsScreen}
        ensByAccountAddress={ensByAccountAddress}
        permittedAddresses={permittedAccounts}
        isLoading={isLoading}
        favicon={faviconSource}
        urlWithProtocol={urlWithProtocol}
        hostname={hostname}
        secureIcon={secureIcon}
        accountAvatarType={accountAvatarType}
      />
    ),
    [
      ensByAccountAddress,
      isLoading,
      permittedAccounts,
      accountsFilteredByPermissions,
      setPermissionsScreen,
      faviconSource,
      hostname,
      urlWithProtocol,
      secureIcon,
      accountAvatarType,
>>>>>>> stable
    ],
  );

  const renderChooseFromPermittedNetworksScreen = useCallback(
    () => (
      <NetworkPermissionsConnected
        onSetPermissionsScreen={setPermissionsScreen}
        onDismissSheet={hideSheet}
        favicon={faviconSource}
        hostname={hostname}
      />
    ),
<<<<<<< HEAD
    [setPermissionsScreen, hideSheet, faviconSource, hostname],
=======
    [
      setPermissionsScreen,
      hideSheet,
      faviconSource,
      hostname,
    ],
>>>>>>> stable
  );

  const renderNetworkPermissionSummaryScreen = useCallback(() => {
    const permissionsSummaryProps: PermissionsSummaryProps = {
      currentPageInformation: {
        currentEnsName: '',
        icon: faviconSource as string,
        url: urlWithProtocol,
      },
      onEdit: () => {
        setPermissionsScreen(AccountPermissionsScreens.EditAccountsPermissions);
      },
      onEditNetworks: () =>
        setPermissionsScreen(AccountPermissionsScreens.ConnectMoreNetworks),
      onUserAction: setUserIntent,
      onAddNetwork: () => {
<<<<<<< HEAD
        if (!currentEvmChainId) {
          throw new Error('No chainId provided');
        }

        const currentEvmCaipChainId: CaipChainId = `eip155:${parseInt(
          currentEvmChainId,
          16,
        )}`;

        let currentlyPermittedChains: CaipChainId[] = [];
        try {
          const caveat = getCaip25Caveat(hostname);
          currentlyPermittedChains = caveat
            ? getAllScopesFromCaip25CaveatValue(caveat.value)
=======
        if (!currentChainId) {
          throw new Error('No chainId provided');
        }

        let currentlyPermittedChains: string[] = [];
        try {
          const caveat = getCaip25Caveat(hostname);
          currentlyPermittedChains = caveat
            ? getPermittedEthChainIds(caveat.value)
>>>>>>> stable
            : [];
        } catch (e) {
          Logger.error(e as Error, 'Error getting permitted chains caveat');
        }

<<<<<<< HEAD
        if (currentlyPermittedChains.includes(currentEvmCaipChainId)) {
          return;
        }

        const availableCaipChainIds = Object.keys(networkConfigurations);
        const permittedAvailableChainIds = currentlyPermittedChains.filter(
          (caipChainId) => availableCaipChainIds.includes(caipChainId),
=======
        if (currentlyPermittedChains.includes(currentChainId)) {
          return;
        }

        const availableChainIds = Object.keys(networkConfigurations);
        const permittedAvailableChainIds = currentlyPermittedChains.reduce(
          (acc: Hex[], chainId) => {
            if (availableChainIds.includes(chainId)) {
              acc.push(toHex(chainId));
            }
            return acc;
          },
          [],
>>>>>>> stable
        );

        updatePermittedChains(
          hostname,
<<<<<<< HEAD
          [currentEvmCaipChainId, ...permittedAvailableChainIds],
=======
          [currentChainId, ...permittedAvailableChainIds],
>>>>>>> stable
          true,
        );

        const networkToastProps: ToastOptions = {
          variant: ToastVariants.Network,
          labelOptions: [
            {
              label: strings('toast.network_permissions_updated'),
            },
          ],
          hasNoTimeout: false,
          networkImageSource: faviconSource,
        };
        toastRef?.current?.showToast(networkToastProps);

        hideSheet();
      },
      onBack: () =>
        isRenderedAsBottomSheet
          ? setPermissionsScreen(AccountPermissionsScreens.Connected)
          : navigate('PermissionsManager'),
      isRenderedAsBottomSheet,
<<<<<<< HEAD
      accountAddresses: permittedCaipAccountIds,
=======
      accountAddresses: permittedAccounts.map(toChecksumHexAddress) as string[],
>>>>>>> stable
      accounts,
      networkAvatars,
      isNetworkSwitch: true,
      showActionButtons: false,
      isDisconnectAllShown: false,
      isNonDappNetworkSwitch: true,
      onChooseFromPermittedNetworks: () => {
        setPermissionsScreen(
          AccountPermissionsScreens.ChooseFromPermittedNetworks,
        );
      },
      setTabIndex,
      tabIndex,
    };

    return <PermissionsSummary {...permissionsSummaryProps} />;
  }, [
    networkConfigurations,
    faviconSource,
    urlWithProtocol,
    isRenderedAsBottomSheet,
    navigate,
<<<<<<< HEAD
    permittedCaipAccountIds,
    networkAvatars,
    accounts,
    currentEvmChainId,
=======
    permittedAccounts,
    networkAvatars,
    accounts,
    currentChainId,
>>>>>>> stable
    hideSheet,
    hostname,
    toastRef,
    setTabIndex,
    tabIndex,
  ]);

  const renderPermissionsScreens = useCallback(() => {
    switch (permissionsScreen) {
      case AccountPermissionsScreens.Connected:
        return renderConnectedScreen();
      case AccountPermissionsScreens.ConnectMoreAccounts:
        return renderConnectMoreAccountsScreen();
      case AccountPermissionsScreens.EditAccountsPermissions:
        return renderEditAccountsPermissionsScreen();
      case AccountPermissionsScreens.ConnectMoreNetworks:
        return renderConnectNetworksScreen();
      case AccountPermissionsScreens.ChooseFromPermittedNetworks:
        return renderChooseFromPermittedNetworksScreen();
      case AccountPermissionsScreens.PermissionsSummary:
        return isNonDappNetworkSwitch
          ? renderNetworkPermissionSummaryScreen()
          : renderPermissionsSummaryScreen();
      case AccountPermissionsScreens.AddAccount:
        return renderAddNewAccount(multichainAccountOptions || {});
    }
  }, [
    permissionsScreen,
    isNonDappNetworkSwitch,
    renderConnectedScreen,
    renderConnectMoreAccountsScreen,
    renderEditAccountsPermissionsScreen,
    renderConnectNetworksScreen,
    renderChooseFromPermittedNetworksScreen,
    renderPermissionsSummaryScreen,
    renderNetworkPermissionSummaryScreen,
    renderAddNewAccount,
    multichainAccountOptions,
  ]);

  return isRenderedAsBottomSheet ? (
    <BottomSheet
      style={
        permissionsScreen === AccountPermissionsScreens.PermissionsSummary &&
        styles.bottomSheetBackground
      }
      ref={sheetRef}
      isInteractable={!isNonDappNetworkSwitch}
    >
      {renderPermissionsScreens()}
    </BottomSheet>
  ) : (
    renderPermissionsScreens()
  );
};

export default AccountPermissions;
