import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StackActions,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { KeyringController } from '@metamask/keyring-controller';
import { AccountsController } from '@metamask/accounts-controller';
import { DeviceEvent } from '@metamask/hw-wallet-sdk';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Engine from '../../../../../core/Engine';
import AccountSelector from '../../../../UI/HardwareWallet/AccountSelector';
import BlockingActionModal from '../../../../UI/BlockingActionModal';
import Text from '../../../../Base/Text';
import SelectOptionSheet from '../../../../UI/SelectOptionSheet';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAssetFromTheme, useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { setReloadAccounts } from '../../../../../actions/accounts';
import { HardwareDeviceTypes } from '../../../../../constants/keyringTypes';
import PAGINATION_OPERATIONS from '../../../../../constants/pagination';
import { toFormattedAddress } from '../../../../../util/address';
import { getConnectedDevicesCount } from '../../../../../core/HardwareWallets/analytics';
import { createAdapter } from '../../../../../core/HardwareWallet/adapters/factory';
import createStyles from '../../../LedgerSelectAccount/index.styles';
import SearchingForDevice from '../../SearchingForDevice';
import { LedgerDiscoveryNotFoundView } from '../../LedgerDiscoveryFlow/LedgerDiscoveryNotFound';
import type { DeviceUIConfig, AccountInfo, HDPathOption } from '../DiscoveryFlow.types';
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
}

const DiscoveryAccountSelectionScreen: React.FC<
  DiscoveryAccountSelectionScreenProps
> = ({ config, onBack, selectedDevice }) => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false);
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const styles = createStyles(colors);

  const [isSendingCommands, setIsSendingCommands] = useState(false);
  const [commandError, setCommandError] = useState<Error | null>(null);
  const adapterRef = useRef<ReturnType<typeof createAdapter> | null>(null);
  const [pathChangeCount, setPathChangeCount] = useState(0);

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
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);
  const [selectedPathOption, setSelectedPathOption] = useState<HDPathOption | null>(
    null,
  );
  const [unlockAccounts, setUnlockAccounts] = useState({
    trigger: false,
    accountIndexes: [] as number[],
  });
  const [forgetDevice, setForgetDevice] = useState(false);

  const hdPathOptions = useMemo(
    () => config.accountManager.getHDPathOptions?.() ?? [],
    [config],
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
      adapter.destroy();
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
    [selectedDevice?.id, config.walletType],
  );

  const onConnectHardware = useCallback(async () => {
    setErrorMsg(null);
    await runDeviceLogic(async () => {
      const initialAccounts = await config.accountManager.getAccounts(
        String(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
      );
      setAccounts(initialAccounts);
    });
    setHasLoadedAccounts(true);
  }, [runDeviceLogic, config.accountManager]);

  useEffect(() => {
    onConnectHardware().catch((error: Error) => {
      setErrorMsg(getDisplayErrorMessage(error.message));
      setHasLoadedAccounts(true);
    });
  }, [onConnectHardware]);

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
  }, [closeEntireFlow, config.accountManager, createEventBuilder, dispatch, trackEvent]);

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

  if (!hasLoadedAccounts && !commandError && !errorMsg) {
    return <SearchingForDevice />;
  }

  if ((commandError || errorMsg) && accounts.length <= 0) {
    return <LedgerDiscoveryNotFoundView onBack={onBack} />;
  }

  return (
    <>
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.navbarRightButton}>
            <MaterialIcon name="close" size={15} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.selectorContainer}>
          {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
          <Text style={styles.mainTitle}>
            {config.strings.selectAccounts}
          </Text>
          {hdPathOptions.length > 0 && (
            <>
              <Text style={styles.selectorTitle}>
                {strings('ledger.select_hd_path')}
              </Text>
              <View style={styles.pathSelector}>
                <SelectOptionSheet
                  options={hdPathOptions}
                  label={strings('ledger.select_hd_path')}
                  onValueChange={async (value) =>
                    await onSelectedPathChanged(value)
                  }
                  selectedValue={selectedPathOption?.value ?? ''}
                />
              </View>
            </>
          )}
        </View>
        <AccountSelector
          accounts={accounts}
          selectedAccounts={existingAccounts}
          nextPage={nextPage}
          prevPage={prevPage}
          onUnlock={(accountIndexes: number[]) => {
            setErrorMsg(null);
            setUnlockAccounts({ trigger: true, accountIndexes });
            setBlockingModalVisible(true);
          }}
          onForget={() => {
            setErrorMsg(null);
            setForgetDevice(true);
            setBlockingModalVisible(true);
          }}
        />
      </SafeAreaView>
      <BlockingActionModal
        modalVisible={blockingModalVisible}
        isLoadingAction={isSendingCommands}
        onAnimationCompleted={onAnimationCompleted}
      >
        <Text style={styles.text}>{strings('common.please_wait')}</Text>
      </BlockingActionModal>
    </>
  );
};

export default DiscoveryAccountSelectionScreen;
