import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StackActions,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { KeyringController } from '@metamask/keyring-controller';
import { AccountsController } from '@metamask/accounts-controller';
import { DeviceEvent, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { UR } from '@ngraveio/bc-ur';
import CheckBox from '@react-native-community/checkbox';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
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
import Engine from '../../../../../core/Engine';
import AnimatedQRScannerModal from '../../../../UI/QRHardware/AnimatedQRScanner';
import BlockingActionModal from '../../../../UI/BlockingActionModal';
import SelectOptionSheet from '../../../../UI/SelectOptionSheet';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { setReloadAccounts } from '../../../../../actions/accounts';
import { HardwareDeviceTypes } from '../../../../../constants/keyringTypes';
import PAGINATION_OPERATIONS from '../../../../../constants/pagination';
import { toFormattedAddress } from '../../../../../util/address';
import { renderFromWei } from '../../../../../util/number';
import { getConnectedDevicesCount } from '../../../../../core/HardwareWallets/analytics';
import { createAdapter } from '../../../../../core/HardwareWallet/adapters/factory';
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

interface DiscoveryAccountSelectionScreenProps {
  config: DeviceUIConfig;
  onBack: () => void;
  selectedDevice: DiscoveredDevice;
  /** Accounts pre-loaded by the orchestrator; when provided the screen renders immediately. */
  initialAccounts?: AccountInfo[];
}

const styles = StyleSheet.create({
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  checkbox: {
    width: Platform.OS === 'ios' ? 20 : 24,
    height: Platform.OS === 'ios' ? 20 : 24,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});

const DiscoveryAccountSelectionScreen: React.FC<
  DiscoveryAccountSelectionScreenProps
> = ({ config, onBack, selectedDevice, initialAccounts }) => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();

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

  const accountsController = useMemo(() => {
    const { AccountsController: controller } = Engine.context as {
      AccountsController: AccountsController;
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
        await adapter.connect(selectedDevice.id);
        const ready = await adapter.ensureDeviceReady(selectedDevice.id);
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

  const onConnectHardware = useCallback(async () => {
    setErrorMsg(null);

    if (isQrWallet) {
      setIsQrScanning(true);
      try {
        const fetchedAccounts = await config.accountManager.getAccounts(
          String(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
        );
        setAccounts(fetchedAccounts);
      } finally {
        setIsQrScanning(false);
      }
    } else {
      await runDeviceLogic(async () => {
        const fetchedAccounts = await config.accountManager.getAccounts(
          String(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
        );
        setAccounts(fetchedAccounts);
      });
    }
  }, [runDeviceLogic, config.accountManager, isQrWallet]);

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
    runDeviceLogic(async () => {
      try {
        const refreshed = await config.accountManager.getAccounts(
          String(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
        );
        setAccounts(refreshed);
      } catch (error) {
        setErrorMsg(getDisplayErrorMessage((error as Error).message));
      }
    }).finally(() => {
      setBlockingModalVisible(false);
    });
  }, [pathChangeCount, runDeviceLogic, config.accountManager]);

  const nextPage = useCallback(async () => {
    setBlockingModalVisible(true);
    try {
      await runDeviceLogic(async () => {
        try {
          const next = await config.accountManager.getAccounts(
            String(PAGINATION_OPERATIONS.GET_NEXT_PAGE),
          );
          setAccounts(next);
        } catch (error) {
          setErrorMsg(getDisplayErrorMessage((error as Error).message));
        }
      });
    } finally {
      setBlockingModalVisible(false);
    }
  }, [runDeviceLogic, config.accountManager]);

  const prevPage = useCallback(async () => {
    setBlockingModalVisible(true);
    try {
      await runDeviceLogic(async () => {
        try {
          const prev = await config.accountManager.getAccounts(
            String(PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE),
          );
          setAccounts(prev);
        } catch (error) {
          setErrorMsg(getDisplayErrorMessage((error as Error).message));
        }
      });
    } finally {
      setBlockingModalVisible(false);
    }
  }, [runDeviceLogic, config.accountManager]);

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
    await config.accountManager.forgetDevice();
    dispatch(setReloadAccounts(true));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN).build(),
    );
    setBlockingModalVisible(false);
    closeEntireFlow();
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
        {/* Header */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="h-14 px-1"
        >
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerButton}
            testID="discovery-accounts-back"
          >
            <Icon
              name={IconName.ArrowLeft}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          </TouchableOpacity>
          {hdPathOptions.length > 0 ? (
            <TouchableOpacity
              onPress={() => setShowHdPathSheet(true)}
              style={styles.headerButton}
              testID="discovery-accounts-settings"
            >
              <Icon
                name={IconName.Setting}
                size={IconSize.Md}
                color={IconColor.IconDefault}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </Box>

        {/* Title */}
        <Box twClassName="px-4 pb-4">
          <Text variant={TextVariant.HeadingLg}>
            {config.strings.selectAccounts}
          </Text>
        </Box>

        {/* Error message */}
        {errorMsg ? (
          <Box twClassName="px-4 pb-2">
            <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
              {errorMsg}
            </Text>
          </Box>
        ) : null}

        {/* Account list */}
        <FlatList
          data={accounts}
          keyExtractor={(item) => `account-${item.index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isAlreadyImported = existingAccountsSet.has(
              toFormattedAddress(item.address),
            );
            const isChecked =
              checkedIndexes.has(item.index) || isAlreadyImported;
            const balance =
              accountsBalance[item.address]?.balance ?? item.balance ?? '0x0';
            const shortAddress = `${item.address.slice(0, 7)}...${item.address.slice(-4)}`;

            return (
              <View
                style={[
                  styles.card,
                  {
                    borderColor: colors.border.muted,
                    backgroundColor: colors.background.default,
                  },
                ]}
              >
                {/* Account name + checkbox */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Text variant={TextVariant.BodyMd}>
                    {`Account ${item.index + 1}`}
                  </Text>
                  <CheckBox
                    style={styles.checkbox}
                    disabled={isAlreadyImported}
                    value={isChecked}
                    onValueChange={() => toggleAccount(item.index)}
                    boxType="square"
                    tintColors={{
                      true: colors.primary.default,
                      false: colors.border.default,
                    }}
                    onCheckColor={colors.background.default}
                    onFillColor={colors.primary.default}
                    onTintColor={colors.primary.default}
                  />
                </Box>

                {/* Total balance */}
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  twClassName="mt-0.5"
                >
                  {renderFromWei(balance)} ETH
                </Text>

                {/* Divider */}
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border.muted },
                  ]}
                />

                {/* Ethereum network row */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                >
                  <Box
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Center}
                    twClassName="h-10 w-10 rounded-full bg-muted mr-3"
                  >
                    <Icon
                      name={IconName.Ethereum}
                      size={IconSize.Md}
                      color={IconColor.IconDefault}
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
                  <Text variant={TextVariant.BodyMd}>
                    {renderFromWei(balance)} ETH
                  </Text>
                </Box>
              </View>
            );
          }}
          ListFooterComponent={
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              twClassName="mt-2 mb-2 px-4"
            >
              <TouchableOpacity onPress={prevPage} style={styles.pageButton}>
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
              </TouchableOpacity>
              <TouchableOpacity onPress={nextPage} style={styles.pageButton}>
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
              </TouchableOpacity>
            </Box>
          }
        />

        {/* Bottom action bar */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="gap-4 px-4 pt-4 pb-2"
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
