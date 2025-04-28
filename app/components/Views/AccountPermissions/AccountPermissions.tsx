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
import { isEqual } from 'lodash';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Engine from '../../../core/Engine';
import {
  addPermittedAccounts,
  updatePermittedChains,
  getCaip25Caveat,
  getPermittedAccountsByHostname,
  removePermittedAccounts,
} from '../../../core/Permissions';
import AccountConnectMultiSelector from '../AccountConnect/AccountConnectMultiSelector';
import NetworkConnectMultiSelector from '../NetworkConnect/NetworkConnectMultiSelector';
import Logger from '../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { ToastOptions } from '../../../component-library/components/Toast/Toast.types';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAccounts, Account } from '../../hooks/useAccounts';
import getAccountNameWithENS from '../../../util/accounts';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import { getActiveTabUrl } from '../../../util/transactions';
import { strings } from '../../../../locales/i18n';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import { selectEvmChainId, selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

// Internal dependencies.
import {
  AccountPermissionsProps,
  AccountPermissionsScreens,
} from './AccountPermissions.types';
import AccountPermissionsConnected from './AccountPermissionsConnected';
import AccountPermissionsRevoke from './AccountPermissionsRevoke';
import { USER_INTENT } from '../../../constants/permissions';
import useFavicon from '../../hooks/useFavicon/useFavicon';
import URLParse from 'url-parse';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { selectPermissionControllerState } from '../../../selectors/snaps/permissionController';
import { RootState } from '../../../reducers';
import { getNetworkImageSource } from '../../../util/networks';
import PermissionsSummary from '../../../components/UI/PermissionsSummary';
import { PermissionsSummaryProps } from '../../../components/UI/PermissionsSummary/PermissionsSummary.types';
import { toChecksumHexAddress, toHex } from '@metamask/controller-utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import NetworkPermissionsConnected from './NetworkPermissionsConnected';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { getPermittedEthChainIds } from '@metamask/chain-agnostic-permission';
import { Hex } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';

const AccountPermissions = (props: AccountPermissionsProps) => {
  const { navigate } = useNavigation();
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

  const permittedChains: string[] = [];
  // rename this to permittedAddresses
  const selectedAddresses: string[] = [];
  const setSelectedAddresses = () => {};
  const accountsLength = 0
  // const accountsLength = useSelector(selectAccountsLength);

  const currentChainId = useSelector(selectEvmChainId);

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
  const permittedAccountsList = useSelector(selectPermissionControllerState);
  const permittedAccountsByHostname = getPermittedAccountsByHostname(
    permittedAccountsList,
    hostname,
  );
  const [networkAvatars, setNetworkAvatars] = useState<
    ({ name: string; imageSource: string } | null)[]
  >([]);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const sheetRef = useRef<BottomSheetRef>(null);
  const [permissionsScreen, setPermissionsScreen] =
    useState<AccountPermissionsScreens>(
      isNonDappNetworkSwitch
        ? AccountPermissionsScreens.PermissionsSummary
        : initialScreen,
    );
  const { evmAccounts: accounts, ensByAccountAddress } = useAccounts({
    isLoading,
  });
  const previousPermittedAccounts = useRef<string[]>();
  const previousIdentitiesListSize = useRef<number>();
  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress: string = permittedAccountsByHostname[0];

  const [userIntent, setUserIntent] = useState(USER_INTENT.None);
  const [networkSelectorUserIntent, setNetworkSelectorUserIntent] = useState(
    USER_INTENT.None,
  );

  const { chainId } = useNetworkInfo(hostname);

  useEffect(() => {
    let currentlyPermittedChains: string[] = [];
    try {
      const caveat = getCaip25Caveat(hostname);
      currentlyPermittedChains = caveat
        ? getPermittedEthChainIds(caveat.value)
        : [];
    } catch (e) {
      Logger.error(e as Error, 'Error getting permitted chains caveat');
    }

    const networks = Object.entries(networkConfigurations)
      .filter(([_, network]) => !isNonEvmChainId(network.chainId))
      .map(([key, network]: [string, NetworkConfiguration]) => ({
        id: key,
        name: network.name,
        rpcUrl: network.rpcEndpoints[network.defaultRpcEndpointIndex].url,
        isSelected: false,
        chainId: network?.chainId,
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        imageSource: getNetworkImageSource({
          chainId: network?.chainId,
        }),
      }));

    const theNetworkAvatars: ({ name: string; imageSource: string } | null)[] =
      currentlyPermittedChains.map((selectedId) => {
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

    if (
      [USER_INTENT.None, USER_INTENT.Confirm].includes(
        networkSelectorUserIntent,
      )
    ) {
      setNetworkAvatars(theNetworkAvatars);
    }
  }, [hostname, networkConfigurations, networkSelectorUserIntent]);

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
      permittedAccountsByHostname.length === 0
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

      previousPermittedAccounts.current = permittedAccountsByHostname.length;
    }
  }, [
    permittedAccountsByHostname,
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
      const lowercasedAccount = account.address.toLowerCase();
      if (permittedAccountsByHostname.includes(lowercasedAccount)) {
        accountsByPermittedStatus.permitted.push(account);
      } else {
        accountsByPermittedStatus.unpermitted.push(account);
      }
    });

    return accountsByPermittedStatus;
  }, [accounts, permittedAccountsByHostname]);

  // todo: handle adding created account here
  const handleCreateAccount = useCallback(
    async () => {
      const { KeyringController } = Engine.context;
      try {
        setIsLoading(true);
        await KeyringController.addNewAccount();
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
      } catch (e) {
        Logger.error(e as Error, 'Error while trying to add a new account.');
      } finally {
        setIsLoading(false);
      }
    },
    /* eslint-disable-next-line */
    [setIsLoading],
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

  const handleSelectChainIds = useCallback(async (chainIds: string[]) => {
    if (chainIds.length === 0) {
      toggleRevokeAllNetworkPermissionsModal()
      return;
    }

      // Check if current network was originally permitted and is now being removed
      const wasCurrentNetworkOriginallyPermitted =
        permittedChains.includes(currentChainId);
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

      // is this needed?...
      const hexSelectedChainIds = chainIds.map(toHex);
      const removeExistingChainPermissions = true;
      updatePermittedChains(hostname, hexSelectedChainIds, removeExistingChainPermissions);
      setUserIntent(USER_INTENT.Confirm);
  }, [])

  const handleConnect = useCallback(() => {
    try {
      setIsLoading(true);
      let newActiveAddress;
      let connectedAccountLength = 0;
      let removedAccountCount = 0;

      // Function to normalize Ethereum addresses using checksum
      const normalizeAddresses = (addresses: string[]) =>
        addresses.map((address) => toChecksumHexAddress(address));

      // Retrieve the list of permitted accounts for the given hostname
      const permittedAccounts = getPermittedAccountsByHostname(
        permittedAccountsList,
        hostname,
      );

      // Normalize permitted accounts and selected addresses to checksummed format
      const normalizedPermittedAccounts = normalizeAddresses(permittedAccounts);
      const normalizedSelectedAddresses = normalizeAddresses(selectedAddresses);

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
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ADD_ACCOUNT_DAPP_PERMISSIONS)
          .addProperties({
            number_of_accounts: totalAccounts,
            number_of_accounts_connected: connectedAccountLength,
            number_of_networks: nonTestnetNetworks,
          })
          .build(),
      );
    } catch (e) {
      Logger.error(e as Error, 'Error while trying to connect to a dApp.');
    } finally {
      setIsLoading(false);
    }
  }, [
    permittedAccountsList,
    selectedAddresses,
    accounts,
    setIsLoading,
    hostname,
    ensByAccountAddress,
    toastRef,
    accountAvatarType,
    accountsLength,
    nonTestnetNetworks,
    trackEvent,
    createEventBuilder,
  ]);

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
    urlWithProtocol
  ]);

  useEffect(() => {
    if (userIntent === USER_INTENT.None) return;
    const handleUserActions = (action: USER_INTENT) => {
      switch (action) {
        case USER_INTENT.Confirm: {
          handleConnect();
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
        case USER_INTENT.Create:
        case USER_INTENT.CreateMultiple: {
          handleCreateAccount();
          break;
        }
        case USER_INTENT.EditMultiple: {
          handleConnect();
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
    handleConnect,
    accounts?.length,
    trackEvent,
    createEventBuilder,
  ]);

  const renderConnectedScreen = useCallback(
    () => (
      <AccountPermissionsConnected
        isLoading={isLoading}
        onSetSelectedAddresses={setSelectedAddresses}
        onSetPermissionsScreen={setPermissionsScreen}
        onDismissSheet={hideSheet}
        accounts={accountsFilteredByPermissions.permitted}
        ensByAccountAddress={ensByAccountAddress}
        selectedAddresses={[activeAddress]}
        favicon={faviconSource}
        hostname={hostname}
        urlWithProtocol={urlWithProtocol}
        secureIcon={secureIcon}
        accountAvatarType={accountAvatarType}
      />
    ),
    [
      ensByAccountAddress,
      activeAddress,
      isLoading,
      accountsFilteredByPermissions,
      setSelectedAddresses,
      setPermissionsScreen,
      hideSheet,
      faviconSource,
      hostname,
      urlWithProtocol,
      secureIcon,
      accountAvatarType,
    ],
  );

  const renderPermissionsSummaryScreen = useCallback(() => {
    const checksummedPermittedAddresses = permittedAccountsByHostname.map(
      toChecksumHexAddress<string>,
    );

    const permissionsSummaryProps: PermissionsSummaryProps = {
      currentPageInformation: {
        currentEnsName: '',
        icon: faviconSource as string,
        url: urlWithProtocol,
      },
      onEdit: () => {
        setPermissionsScreen(AccountPermissionsScreens.EditAccountsPermissions);
        setSelectedAddresses(checksummedPermittedAddresses);
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
      accountAddresses: checksummedPermittedAddresses,
      accounts,
      networkAvatars,
    };

    return <PermissionsSummary {...permissionsSummaryProps} />;
  }, [
    isRenderedAsBottomSheet,
    navigate,
    permittedAccountsByHostname,
    setSelectedAddresses,
    networkAvatars,
    accounts,
    faviconSource,
    urlWithProtocol
  ]);

  const renderEditAccountsPermissionsScreen = useCallback(
    () => (
      <AccountConnectMultiSelector
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        defaultSelectedAddresses={selectedAddresses}
        onSubmit={(checkedAddresses) => {
          setSelectedAddresses(checkedAddresses);
        }}
        isLoading={isLoading}
        hostname={hostname}
        isAutoScrollEnabled={false}
        onBack={() =>
          setPermissionsScreen(AccountPermissionsScreens.PermissionsSummary)
        }
        screenTitle={strings('accounts.edit_accounts_title')}
        isRenderedAsBottomSheet={isRenderedAsBottomSheet}
      />
    ),
    [
      ensByAccountAddress,
      selectedAddresses,
      isLoading,
      hostname,
      isRenderedAsBottomSheet,
      accounts,
    ],
  );

  const renderConnectMoreAccountsScreen = useCallback(
    () => (
      <AccountConnectMultiSelector
        accounts={accountsFilteredByPermissions.unpermitted}
        ensByAccountAddress={ensByAccountAddress}
        defaultSelectedAddresses={selectedAddresses}
        onSubmit={(checkedAddresses) => {
          setSelectedAddresses([
            ...checkedAddresses,
            ...permittedAccountsByHostname,
          ]);
        }}
        isLoading={isLoading}
        hostname={hostname}
        isAutoScrollEnabled={false}
        onBack={() => setPermissionsScreen(AccountPermissionsScreens.Connected)}
        screenTitle={strings('accounts.connect_more_accounts')}
        showDisconnectAllButton={false}
      />
    ),
    [
      ensByAccountAddress,
      selectedAddresses,
      isLoading,
      accountsFilteredByPermissions,
      hostname,
      permittedAccountsByHostname,
    ],
  );

  const renderConnectNetworksScreen = useCallback(
    () => (
      <NetworkConnectMultiSelector
        // fix this
        // add user intent
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
        // fix this
        defaultSelectedChainIds={[]}
      />
    ),
    [
      isLoading,
      hostname,
      isRenderedAsBottomSheet,
      isNonDappNetworkSwitch,
    ],
  );

  const renderRevokeScreen = useCallback(
    () => (
      <AccountPermissionsRevoke
        accounts={accountsFilteredByPermissions.permitted}
        onSetPermissionsScreen={setPermissionsScreen}
        ensByAccountAddress={ensByAccountAddress}
        permittedAddresses={permittedAccountsByHostname}
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
      permittedAccountsByHostname,
      accountsFilteredByPermissions,
      setPermissionsScreen,
      faviconSource,
      hostname,
      urlWithProtocol,
      secureIcon,
      accountAvatarType,
    ],
  );

  const renderChooseFromPermittedNetworksScreen = useCallback(
    () => (
      <NetworkPermissionsConnected
        isLoading={isLoading}
        onSetSelectedAddresses={setSelectedAddresses}
        onSetPermissionsScreen={setPermissionsScreen}
        onDismissSheet={hideSheet}
        accounts={accountsFilteredByPermissions.permitted}
        ensByAccountAddress={ensByAccountAddress}
        selectedAddresses={[activeAddress]}
        favicon={faviconSource}
        hostname={hostname}
        urlWithProtocol={urlWithProtocol}
        secureIcon={secureIcon}
        accountAvatarType={accountAvatarType}
      />
    ),
    [
      ensByAccountAddress,
      activeAddress,
      isLoading,
      accountsFilteredByPermissions,
      setSelectedAddresses,
      setPermissionsScreen,
      hideSheet,
      faviconSource,
      hostname,
      urlWithProtocol,
      secureIcon,
      accountAvatarType,
    ],
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
        setSelectedAddresses(
          permittedAccountsByHostname.map(toChecksumHexAddress),
        );
      },
      onEditNetworks: () =>
        setPermissionsScreen(AccountPermissionsScreens.ConnectMoreNetworks),
      onUserAction: setUserIntent,
      onAddNetwork: () => {
        if (!chainId) {
          throw new Error('No chainId provided');
        }

        let currentlyPermittedChains: string[] = [];
        try {
          const caveat = getCaip25Caveat(hostname);
          currentlyPermittedChains = caveat
            ? getPermittedEthChainIds(caveat.value)
            : [];
        } catch (e) {
          Logger.error(e as Error, 'Error getting permitted chains caveat');
        }

        if (currentlyPermittedChains.includes(chainId)) {
          return;
        }

        updatePermittedChains(hostname, [chainId]);

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
      accountAddresses: permittedAccountsByHostname.map(toChecksumHexAddress),
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
    };

    return <PermissionsSummary {...permissionsSummaryProps} />;
  }, [
    faviconSource,
    urlWithProtocol,
    isRenderedAsBottomSheet,
    navigate,
    permittedAccountsByHostname,
    setSelectedAddresses,
    networkAvatars,
    accounts,
    chainId,
    hideSheet,
    hostname,
    toastRef,
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
      case AccountPermissionsScreens.Revoke:
        return renderRevokeScreen();
      case AccountPermissionsScreens.ChooseFromPermittedNetworks:
        return renderChooseFromPermittedNetworksScreen();
      case AccountPermissionsScreens.PermissionsSummary:
        return isNonDappNetworkSwitch
          ? renderNetworkPermissionSummaryScreen()
          : renderPermissionsSummaryScreen();
    }
  }, [
    permissionsScreen,
    isNonDappNetworkSwitch,
    renderConnectedScreen,
    renderConnectMoreAccountsScreen,
    renderEditAccountsPermissionsScreen,
    renderConnectNetworksScreen,
    renderRevokeScreen,
    renderChooseFromPermittedNetworksScreen,
    renderPermissionsSummaryScreen,
    renderNetworkPermissionSummaryScreen,
  ]);

  return isRenderedAsBottomSheet ? (
    <BottomSheet ref={sheetRef} isInteractable={!isNonDappNetworkSwitch}>
      {renderPermissionsScreens()}
    </BottomSheet>
  ) : (
    renderPermissionsScreens()
  );
};

export default AccountPermissions;
