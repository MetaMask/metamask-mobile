import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StackActions,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { KeyringController } from '@metamask/keyring-controller';
import { DeviceEvent, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { UR } from '@ngraveio/bc-ur';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Checkbox from '../../../../../component-library/components/Checkbox';
import Engine from '../../../../../core/Engine';
import AnimatedQRScannerModal from '../../../../UI/QRHardware/AnimatedQRScanner';
import BlockingActionModal from '../../../../UI/BlockingActionModal';
import SelectOptionSheet from '../../../../UI/SelectOptionSheet';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { setReloadAccounts } from '../../../../../actions/accounts';
import { HardwareDeviceTypes } from '../../../../../constants/keyringTypes';
import PAGINATION_OPERATIONS from '../../../../../constants/pagination';
import { toFormattedAddress } from '../../../../../util/address';
import { renderFromWei } from '../../../../../util/number/bigint';
import { getConnectedDevicesCount } from '../../../../../core/HardwareWallets/analytics';
import { createAdapter } from '../../../../../core/HardwareWallet/adapters/factory';
import { useHardwareWallet } from '../../../../../core/HardwareWallet';
import { useAccountsBalance } from '../../../../UI/HardwareWallet/AccountSelector/hooks';
import DiscoveryNotFoundScreen from './DiscoveryNotFound';
import type {
  DeviceUIConfig,
  AccountInfo,
  HDPathOption,
} from '../DiscoveryFlow.types';
import type { DiscoveredDevice } from '../../../../../core/HardwareWallet/types';

const getDisplayErrorMessage = (errorMessage: string): string => {
  if (errorMessage.includes('ETH app')) {
    return strings('ledger.eth_app_not_open_message');
  }
  return errorMessage;
};

const formatAccountBalance = (balance: string) =>
  `${renderFromWei(balance)} ETH`;

const getShortAddress = (address: string) =>
  `${address.slice(0, 7)}...${address.slice(-4)}`;

interface DiscoveryAccountSelectionScreenProps {
  config: DeviceUIConfig;
  onBack: () => void;
  selectedDevice: DiscoveredDevice;
  /** Accounts pre-loaded by the orchestrator; when provided the screen renders immediately. */
  initialAccounts?: AccountInfo[];
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
});

const DiscoveryAccountSelectionScreen: React.FC<
  DiscoveryAccountSelectionScreenProps
> = ({ config, onBack, selectedDevice, initialAccounts }) => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { showHardwareWalletError, setTargetWalletType } = useHardwareWallet();

  const hasPreloadedAccounts = (initialAccounts?.length ?? 0) > 0;

  const [isSendingCommands, setIsSendingCommands] = useState(false);
  const [commandError, setCommandError] = useState<Error | null>(null);
  const adapterRef = useRef<ReturnType<typeof createAdapter> | null>(null);
  const [pathChangeCount, setPathChangeCount] = useState(0);
  const [showHdPathSheet, setShowHdPathSheet] = useState(false);

  const keyringController = useMemo(() => {
    const { KeyringController: controller } = Engine.context as {
      KeyringController: KeyringController;
    };
    return controller;
  }, []);

  const [blockingModalVisible, setBlockingModalVisible] = useState(false);
  const [accounts, setAccounts] = useState<AccountInfo[]>(
    initialAccounts ?? [],
  );
  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);
  const [selectedPathOption, setSelectedPathOption] =
    useState<HDPathOption | null>(null);
  const [checkedIndexes, setCheckedIndexes] = useState<Set<number>>(new Set());
  const [unlockAccounts, setUnlockAccounts] = useState({
    trigger: false,
    accountIndexes: [] as number[],
  });
  const [forgetDevice, setForgetDevice] = useState(false);
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const isQrWallet = config.walletType === HardwareWalletType.Qr;

  const hdPathOptions = useMemo(
    () => config.accountManager.getHDPathOptions?.() ?? [],
    [config],
  );

  const accountsBalance = useAccountsBalance(accounts);

  const existingAccountsSet = useMemo(
    () => new Set(existingAccounts.map(toFormattedAddress)),
    [existingAccounts],
  );

  useEffect(() => {
    setTargetWalletType(config.walletType);
  }, [config.walletType, setTargetWalletType]);

  useEffect(() => {
    if (hdPathOptions.length > 0 && !selectedPathOption) {
      setSelectedPathOption(hdPathOptions[0]);
    }
  }, [hdPathOptions, selectedPathOption]);

  useEffect(() => {
    keyringController.getAccounts().then((value: string[]) => {
      setExistingAccounts(value.map(toFormattedAddress));
    });
  }, [keyringController]);

  useEffect(() => {
    const adapter = createAdapter(config.walletType, {
      onDisconnect: () => undefined,
      onDeviceEvent: (payload) => {
        if (payload.event === DeviceEvent.AppOpened) {
          setIsSendingCommands(false);
        }
      },
    });
    adapterRef.current = adapter;
    return () => {
      adapter.disconnect().catch(() => undefined);
      adapterRef.current = null;
    };
  }, [config.walletType]);

  const runDeviceLogic = useCallback(
    async (logic: () => Promise<void>) => {
      const adapter = adapterRef.current;
      if (!adapter || !selectedDevice?.id) return;

      setIsSendingCommands(true);
      try {
        const { ready } = await adapter.ensureDeviceReady(selectedDevice.id);
        if (ready) {
          await logic();
        }
      } catch (error) {
        setCommandError(error as Error);
      } finally {
        setIsSendingCommands(false);
      }
    },
    [selectedDevice?.id],
  );

  const getAccountsPage = useCallback(
    async (operation: number): Promise<AccountInfo[] | undefined> => {
      const fetchAccounts = () =>
        config.accountManager.getAccounts(String(operation));

      if (isQrWallet) {
        return await fetchAccounts();
      }

      let fetchedAccounts: AccountInfo[] | undefined;

      await runDeviceLogic(async () => {
        fetchedAccounts = await fetchAccounts();
      });

      return fetchedAccounts;
    },
    [config.accountManager, isQrWallet, runDeviceLogic],
  );

  const fetchAccountsPage = useCallback(
    async (operation: number): Promise<AccountInfo[]> =>
      await config.accountManager.getAccounts(String(operation)),
    [config.accountManager],
  );

  const onConnectHardware = useCallback(async () => {
    setErrorMsg(null);

    if (isQrWallet) {
      setIsQrScanning(true);
    }

    try {
      const fetchedAccounts = await getAccountsPage(
        PAGINATION_OPERATIONS.GET_FIRST_PAGE,
      );
      if (fetchedAccounts) {
        setAccounts(fetchedAccounts);
        setCurrentPage(0);
      }
    } finally {
      if (isQrWallet) {
        setIsQrScanning(false);
      }
    }
  }, [getAccountsPage, isQrWallet]);

  const onQrScanSuccess = useCallback(async (ur: UR) => {
    setIsQrScanning(false);
    Engine.getQrKeyringScanner().resolvePendingScan({
      type: ur.type,
      cbor: ur.cbor.toString('hex'),
    });
    setErrorMsg(null);
  }, []);

  const onQrScanError = useCallback((error: string) => {
    setErrorMsg(error);
    Engine.getQrKeyringScanner().rejectPendingScan(new Error(error));
    setIsQrScanning(false);
  }, []);

  const cancelQrScan = useCallback(() => {
    Engine.getQrKeyringScanner().rejectPendingScan(new Error('Scan cancelled'));
    setIsQrScanning(false);
  }, []);

  useEffect(() => {
    // Skip initial load when the orchestrator pre-loaded accounts (BLE flow).
    if (hasPreloadedAccounts) return;

    onConnectHardware().catch((error: Error) => {
      setErrorMsg(getDisplayErrorMessage(error.message));
    });
  }, [onConnectHardware, hasPreloadedAccounts]);

  useEffect(() => {
    if (pathChangeCount === 0) return;

    setBlockingModalVisible(true);
    setCheckedIndexes(new Set());
    (async () => {
      try {
        const refreshed = await fetchAccountsPage(
          PAGINATION_OPERATIONS.GET_FIRST_PAGE,
        );
        setCurrentPage(0);
        setAccounts(refreshed);
      } catch (error) {
        showHardwareWalletError(error);
        setErrorMsg(getDisplayErrorMessage((error as Error).message));
      } finally {
        setBlockingModalVisible(false);
      }
    })();
  }, [fetchAccountsPage, pathChangeCount, showHardwareWalletError]);

  const nextPage = useCallback(async () => {
    setBlockingModalVisible(true);
    setCheckedIndexes(new Set());
    try {
      try {
        const next = await fetchAccountsPage(
          PAGINATION_OPERATIONS.GET_NEXT_PAGE,
        );
        setAccounts(next);
        setCurrentPage((page) => page + 1);
      } catch (error) {
        showHardwareWalletError(error);
        setErrorMsg(getDisplayErrorMessage((error as Error).message));
      }
    } finally {
      setBlockingModalVisible(false);
    }
  }, [fetchAccountsPage, showHardwareWalletError]);

  const prevPage = useCallback(async () => {
    setBlockingModalVisible(true);
    setCheckedIndexes(new Set());
    try {
      try {
        const prev = await fetchAccountsPage(
          PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
        );
        setAccounts(prev);
        setCurrentPage((page) => Math.max(0, page - 1));
      } catch (error) {
        showHardwareWalletError(error);
        setErrorMsg(getDisplayErrorMessage((error as Error).message));
      }
    } finally {
      setBlockingModalVisible(false);
    }
  }, [fetchAccountsPage, showHardwareWalletError]);

  const closeEntireFlow = useCallback(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.goBack();
      return;
    }
    navigation.dispatch(StackActions.popToTop());
  }, [navigation]);

  const onUnlock = useCallback(
    async (accountIndexes: number[]) => {
      setBlockingModalVisible(true);
      try {
        await runDeviceLogic(async () => {
          try {
            await config.accountManager.unlockAccounts(accountIndexes);
            const numberOfConnectedDevices = await getConnectedDevicesCount();
            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ADD_ACCOUNT)
                .addProperties({
                  device_type: HardwareDeviceTypes.LEDGER,
                  connected_device_count: numberOfConnectedDevices.toString(),
                })
                .build(),
            );
            closeEntireFlow();
          } catch (error) {
            setErrorMsg(getDisplayErrorMessage((error as Error).message));
          }
        });
      } finally {
        setBlockingModalVisible(false);
      }
    },
    [
      closeEntireFlow,
      config.accountManager,
      createEventBuilder,
      runDeviceLogic,
      trackEvent,
    ],
  );

  const onForget = useCallback(async () => {
    setBlockingModalVisible(true);
    try {
      await config.accountManager.forgetDevice();
      dispatch(setReloadAccounts(true));
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN).build(),
      );
      closeEntireFlow();
    } catch (error) {
      setErrorMsg(getDisplayErrorMessage((error as Error).message));
    } finally {
      setBlockingModalVisible(false);
    }
  }, [
    closeEntireFlow,
    config.accountManager,
    createEventBuilder,
    dispatch,
    trackEvent,
  ]);

  const onAnimationCompleted = useCallback(async () => {
    if (!blockingModalVisible) return;
    if (forgetDevice) {
      setForgetDevice(false);
      await onForget();
    } else if (unlockAccounts.trigger) {
      setUnlockAccounts({ trigger: false, accountIndexes: [] });
      await onUnlock(unlockAccounts.accountIndexes);
    }
  }, [blockingModalVisible, forgetDevice, onForget, onUnlock, unlockAccounts]);

  const onSelectedPathChanged = useCallback(
    async (path: string) => {
      const option = hdPathOptions.find((o) => o.key === path);
      if (!option) return;
      setSelectedPathOption(option);
      await config.accountManager.setHDPath?.(path);
      setPathChangeCount((prev) => prev + 1);
    },
    [hdPathOptions, config.accountManager],
  );

  const toggleAccount = useCallback((index: number) => {
    setCheckedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    setErrorMsg(null);
    setUnlockAccounts({ trigger: true, accountIndexes: [...checkedIndexes] });
    setBlockingModalVisible(true);
  }, [checkedIndexes]);

  const handleForget = useCallback(() => {
    setErrorMsg(null);
    setForgetDevice(true);
    setBlockingModalVisible(true);
  }, []);

  const renderAccountCard = useCallback(
    ({ item }: { item: AccountInfo }) => {
      const isAlreadyImported = existingAccountsSet.has(
        toFormattedAddress(item.address),
      );
      const isChecked = checkedIndexes.has(item.index) || isAlreadyImported;
      const balance =
        accountsBalance[item.address]?.balance ?? item.balance ?? '0x0';
      const shortAddress = getShortAddress(item.address);

      return (
        <Box
          testID={`discovery-account-card-${item.address}`}
          twClassName="rounded-xl border border-muted bg-background-muted px-4 py-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text variant={TextVariant.BodyMd}>
              {`Account ${item.index + 1}`}
            </Text>
            <Checkbox
              isChecked={isChecked}
              isDisabled={isAlreadyImported}
              onPress={() => toggleAccount(item.index)}
              testID={`discovery-account-checkbox-${item.index}`}
            />
          </Box>

          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-1"
          >
            {formatAccountBalance(balance)}
          </Text>

          <Box twClassName="my-3 border-b border-muted" />

          <Box
            testID={`discovery-account-row-${item.index}`}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-4"
          >
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="h-10 w-10 rounded-xl bg-primary-muted"
            >
              <Icon
                name={IconName.Ethereum}
                size={IconSize.Md}
                color={IconColor.PrimaryDefault}
              />
            </Box>

            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd}>Ethereum</Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {shortAddress}
              </Text>
            </Box>
          </Box>
        </Box>
      );
    },
    [accountsBalance, checkedIndexes, existingAccountsSet, toggleAccount],
  );

  // === Error state (no accounts loaded) ===
  if ((commandError || errorMsg) && accounts.length <= 0) {
    return <DiscoveryNotFoundScreen config={config} onBack={onBack} />;
  }

  return (
    <>
      <SafeAreaView
        edges={['top', 'bottom']}
        style={tw.style('flex-1 bg-default')}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="h-14 px-1"
        >
          <ButtonIcon
            onPress={onBack}
            iconName={IconName.ArrowLeft}
            iconProps={{ color: IconColor.IconDefault }}
            size={ButtonIconSize.Md}
            testID="discovery-accounts-back"
          />
          {hdPathOptions.length > 0 ? (
            <ButtonIcon
              onPress={() => setShowHdPathSheet(true)}
              iconName={IconName.Setting}
              iconProps={{ color: IconColor.IconDefault }}
              size={ButtonIconSize.Md}
              testID="discovery-accounts-settings"
            />
          ) : (
            <Box twClassName="h-11 w-11" />
          )}
        </Box>

        <Box twClassName="px-4 pb-4">
          <Text variant={TextVariant.HeadingLg}>
            {config.strings.selectAccounts}
          </Text>
        </Box>

        {errorMsg ? (
          <Box twClassName="px-4 pb-2">
            <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
              {errorMsg}
            </Text>
          </Box>
        ) : null}

        <FlatList
          data={accounts}
          keyExtractor={(item) => `account-${item.index}-${item.address}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderAccountCard}
          ListFooterComponent={
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              twClassName="mt-2 mb-2 px-1"
            >
              {currentPage > 0 ? (
                <TouchableOpacity
                  onPress={prevPage}
                  testID="discovery-accounts-prev-page"
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="px-1 py-2"
                  >
                    <Icon
                      name={IconName.ArrowLeft}
                      size={IconSize.Sm}
                      color={IconColor.IconMuted}
                    />
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                      twClassName="ml-1"
                    >
                      {strings('account_selector.prev')}
                    </Text>
                  </Box>
                </TouchableOpacity>
              ) : (
                <Box />
              )}
              <TouchableOpacity
                onPress={nextPage}
                testID="discovery-accounts-next-page"
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="px-1 py-2"
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    twClassName="mr-1"
                  >
                    {strings('account_selector.next')}
                  </Text>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.IconMuted}
                  />
                </Box>
              </TouchableOpacity>
            </Box>
          }
        />

        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="gap-4 border-t border-muted bg-default px-4 pt-4 pb-2"
        >
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            twClassName="flex-1"
            onPress={handleForget}
            testID="discovery-accounts-forget"
          >
            {strings('ledger.forget_device')}
          </Button>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            twClassName="flex-1"
            isDisabled={checkedIndexes.size < 1}
            onPress={handleContinue}
            testID="discovery-accounts-continue"
          >
            {strings('ledger.continue')}
          </Button>
        </Box>
      </SafeAreaView>

      {/* HD Path sheet */}
      {showHdPathSheet && hdPathOptions.length > 0 && (
        <SelectOptionSheet
          options={hdPathOptions}
          label={strings('ledger.select_hd_path')}
          onValueChange={async (value) => {
            setShowHdPathSheet(false);
            await onSelectedPathChanged(value);
          }}
          selectedValue={selectedPathOption?.value ?? ''}
        />
      )}

      <BlockingActionModal
        modalVisible={blockingModalVisible}
        isLoadingAction={isSendingCommands}
        onAnimationCompleted={onAnimationCompleted}
      >
        <Text variant={TextVariant.BodyMd}>
          {strings('common.please_wait')}
        </Text>
      </BlockingActionModal>

      {isQrWallet && (
        <AnimatedQRScannerModal
          visible={isQrScanning}
          purpose={QrScanRequestType.PAIR}
          onScanSuccess={onQrScanSuccess}
          onScanError={onQrScanError}
          hideModal={cancelQrScan}
        />
      )}
    </>
  );
};

export default DiscoveryAccountSelectionScreen;
