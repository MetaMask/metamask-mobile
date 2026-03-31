import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Engine from '../../../core/Engine';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import {
  forgetLedger,
  getHDPath,
  getLedgerAccounts,
  getLedgerAccountsByOperation,
  setHDPath,
  unlockLedgerWalletAccount,
} from '../../../core/Ledger/Ledger';
import { setReloadAccounts } from '../../../actions/accounts';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { KeyringController } from '@metamask/keyring-controller';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import PAGINATION_OPERATIONS from '../../../constants/pagination';
import {
  LEDGER_BIP44_PATH,
  LEDGER_BIP44_STRING,
  LEDGER_LEGACY_PATH,
  LEDGER_LEGACY_STRING,
  LEDGER_LIVE_PATH,
  LEDGER_LIVE_STRING,
  LEDGER_UNKNOWN_STRING,
} from '../../../core/Ledger/constants';
import { createOptionsSheetNavDetails } from '../../UI/SelectOptionSheet';
import { AccountsController } from '@metamask/accounts-controller';
import { formatAddress, toFormattedAddress } from '../../../util/address';
import { getConnectedDevicesCount } from '../../../core/HardwareWallets/analytics';
import { useHardwareWallet } from '../../../core/HardwareWallet';
import { sanitizeDeviceName } from '../../../util/hardwareWallet/deviceNameUtils';
import Images from '../../../images/image-icons';
import {
  AccountSelectionFlow,
  type AccountSelectionItem,
} from '../hardware-wallet/components';

interface OptionType {
  key: string;
  label: string;
  value: string;
}

const LedgerSelectAccount = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const tw = useTailwind();

  const { deviceId, deviceSelection, ensureDeviceReady } = useHardwareWallet();

  const ledgerModelName = useMemo(() => {
    if (deviceSelection?.selectedDevice) {
      return sanitizeDeviceName(deviceSelection.selectedDevice.name);
    }
    return undefined;
  }, [deviceSelection?.selectedDevice]);

  const ledgerPathOptions: OptionType[] = useMemo(
    () => [
      {
        key: LEDGER_LIVE_PATH,
        label: strings('ledger.ledger_live_path'),
        value: LEDGER_LIVE_PATH,
      },
      {
        key: LEDGER_LEGACY_PATH,
        label: strings('ledger.ledger_legacy_path'),
        value: LEDGER_LEGACY_PATH,
      },
      {
        key: LEDGER_BIP44_PATH,
        label: strings('ledger.ledger_bip44_path'),
        value: LEDGER_BIP44_PATH,
      },
    ],
    [],
  );

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

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blockingModalVisible, setBlockingModalVisible] = useState(false);
  const [accounts, setAccounts] = useState<
    { address: string; index: number; balance: string }[]
  >([]);
  const [checkedAccounts, setCheckedAccounts] = useState<Set<number>>(
    new Set(),
  );
  const [forgetDevice, setForgetDevice] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<OptionType>(
    ledgerPathOptions[0],
  );

  useEffect(() => {
    keyringController.getAccounts().then((value: string[]) => {
      setExistingAccounts(value.map(toFormattedAddress));
    });
  }, [keyringController]);

  const showLoadingModal = () => {
    setErrorMsg(null);
    setBlockingModalVisible(true);
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const _accounts = await getLedgerAccountsByOperation(
        PAGINATION_OPERATIONS.GET_FIRST_PAGE,
      );
      setAccounts(_accounts);
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const hasTrackedOpenRef = useRef(false);
  useEffect(() => {
    if (accounts.length > 0 && !hasTrackedOpenRef.current) {
      hasTrackedOpenRef.current = true;
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.HARDWARE_WALLET_ACCOUNT_SELECTOR_OPEN,
        )
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            device_model: ledgerModelName,
          })
          .build(),
      );
    }
  }, [trackEvent, createEventBuilder, accounts, ledgerModelName]);

  useEffect(() => {
    if (accounts.length > 0 && selectedOption) {
      showLoadingModal();

      getLedgerAccountsByOperation(PAGINATION_OPERATIONS.GET_FIRST_PAGE)
        .then((_accounts) => {
          setAccounts(_accounts);
        })
        .catch((e) => {
          setErrorMsg((e as Error).message);
        })
        .finally(() => {
          setBlockingModalVisible(false);
        });
    }
    // accounts.length is only used as a guard, not as a trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption]);

  const nextPage = useCallback(async () => {
    showLoadingModal();
    try {
      const _accounts = await getLedgerAccountsByOperation(
        PAGINATION_OPERATIONS.GET_NEXT_PAGE,
      );
      setAccounts(_accounts);
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setBlockingModalVisible(false);
    }
  }, []);

  const prevPage = useCallback(async () => {
    showLoadingModal();
    try {
      const _accounts = await getLedgerAccountsByOperation(
        PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
      );
      setAccounts(_accounts);
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setBlockingModalVisible(false);
    }
  }, []);

  const updateNewLegacyAccountsLabel = useCallback(async () => {
    if (LEDGER_LEGACY_PATH === (await getHDPath())) {
      const ledgerAccounts = await getLedgerAccounts();
      const newAddedAccounts = ledgerAccounts.filter(
        (account) => !existingAccounts.includes(toFormattedAddress(account)),
      );

      if (newAddedAccounts.length > 0) {
        // get existing account label
        for (const address of newAddedAccounts) {
          const account = accountsController.getAccountByAddress(address);
          if (account) {
            accountsController.setAccountName(
              account.id,
              account.metadata.name + strings('ledger.ledger_legacy_label'),
            );
          }
        }
      }
    }
  }, [accountsController, existingAccounts]);

  const getPathString = (value: string) => {
    if (value === LEDGER_LIVE_PATH) {
      return LEDGER_LIVE_STRING;
    } else if (value === LEDGER_LEGACY_PATH) {
      return LEDGER_LEGACY_STRING;
    } else if (value === LEDGER_BIP44_PATH) {
      return LEDGER_BIP44_STRING;
    }
    return LEDGER_UNKNOWN_STRING;
  };

  const isUnlockingRef = useRef(false);
  const onUnlock = useCallback(
    async (accountIndexes: number[]) => {
      if (isUnlockingRef.current) return;
      isUnlockingRef.current = true;

      try {
        const isReady = await ensureDeviceReady(deviceId);
        if (!isReady) {
          isUnlockingRef.current = false;
          return;
        }

        showLoadingModal();

        for (const index of accountIndexes) {
          await unlockLedgerWalletAccount(index);
        }
        const numberOfConnectedDevices = await getConnectedDevicesCount();
        await updateNewLegacyAccountsLabel();

        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ADD_ACCOUNT)
            .addProperties({
              device_type: HardwareDeviceTypes.LEDGER,
              device_model: ledgerModelName,
              hd_path: getPathString(selectedOption.value),
              connected_device_count: numberOfConnectedDevices.toString(),
            })
            .build(),
        );
        navigation.dispatch(StackActions.pop(2));
      } catch (err) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              device_type: HardwareDeviceTypes.LEDGER,
              device_model: ledgerModelName,
              error: (err as Error).message,
            })
            .build(),
        );
        setBlockingModalVisible(false);
        setErrorMsg((err as Error).message);
        isUnlockingRef.current = false;
        return;
      }

      setBlockingModalVisible(false);
      isUnlockingRef.current = false;
    },
    [
      updateNewLegacyAccountsLabel,
      ledgerModelName,
      trackEvent,
      createEventBuilder,
      selectedOption.value,
      navigation,
      ensureDeviceReady,
      deviceId,
    ],
  );

  const onForget = useCallback(async () => {
    showLoadingModal();
    await forgetLedger();
    dispatch(setReloadAccounts(true));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN)
        .addProperties({
          device_type: HardwareDeviceTypes.LEDGER,
          device_model: ledgerModelName,
        })
        .build(),
    );
    setBlockingModalVisible(false);
    navigation.dispatch(StackActions.pop(2));
  }, [dispatch, trackEvent, createEventBuilder, ledgerModelName, navigation]);

  const onAnimationCompleted = useCallback(async () => {
    if (!blockingModalVisible) {
      return;
    }

    if (forgetDevice) {
      await onForget();
      setBlockingModalVisible(false);
      setForgetDevice(false);
    }
  }, [blockingModalVisible, forgetDevice, onForget]);

  const onSelectedPathChanged = useCallback(
    async (path: string) => {
      const option = ledgerPathOptions.find(
        (pathOption) => pathOption.key === path,
      );
      if (!option) return;
      await setHDPath(path);
      setCheckedAccounts(new Set());
      setSelectedOption(option);
    },
    [ledgerPathOptions],
  );

  const openHdPathSheet = useCallback(() => {
    navigation.navigate(
      ...createOptionsSheetNavDetails({
        label: strings('ledger.select_hd_path'),
        options: ledgerPathOptions,
        selectedValue: selectedOption.value,
        onValueChange: async (value) => {
          await onSelectedPathChanged(value);
        },
      }),
    );
  }, [
    ledgerPathOptions,
    navigation,
    onSelectedPathChanged,
    selectedOption.value,
  ]);

  const toggleAccountSelection = useCallback((accountIndex: number) => {
    setCheckedAccounts((previousCheckedAccounts) => {
      const nextCheckedAccounts = new Set(previousCheckedAccounts);
      if (nextCheckedAccounts.has(accountIndex)) {
        nextCheckedAccounts.delete(accountIndex);
      } else {
        nextCheckedAccounts.add(accountIndex);
      }
      return nextCheckedAccounts;
    });
  }, []);

  const displayAccounts = useMemo<AccountSelectionItem[]>(() => {
    const existingAccountsSet = new Set(
      existingAccounts.map((address) => toFormattedAddress(address)),
    );

    return accounts.map((account) => {
      const isExistingAccount = existingAccountsSet.has(
        toFormattedAddress(account.address),
      );
      const isSelected =
        isExistingAccount || checkedAccounts.has(account.index);
      const formattedAddress = formatAddress(account.address, 'mid');

      return {
        address: account.address,
        index: account.index,
        isExistingAccount,
        isSelected,
        // Mocked asset rows match the approved Figma-first scope until multichain
        // hardware account data is available for this flow.
        totalBalance: '$360.00',
        assets: [
          {
            title: 'Ethereum',
            address: formattedAddress,
            balance: '$120.00',
            iconSource: Images.ETHEREUM,
            kind: 'network',
          },
          {
            title: 'Solana',
            address: '6dk7RD...DEtXQ',
            balance: '$120.00',
            iconSource: Images.SOLANA,
            kind: 'network',
          },
          {
            title: 'Bitcoin',
            address: 'bc1qea...er2fx',
            balance: '$120.00',
            iconSource: Images.BTC,
            kind: 'token',
            label: account.index % 2 === 0 ? 'Taproot' : 'Native Segwit',
          },
        ],
      };
    });
  }, [accounts, checkedAccounts, existingAccounts]);

  const handleContinue = useCallback(() => {
    setErrorMsg(null);
    onUnlock([...checkedAccounts]);
  }, [checkedAccounts, onUnlock]);

  const handleForget = useCallback(() => {
    setErrorMsg(null);
    setForgetDevice(true);
    setBlockingModalVisible(true);
  }, []);

  if (accounts.length <= 0) {
    return (
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        <Box twClassName="flex-1 items-center justify-center px-6">
          {errorMsg ? (
            <Text variant={TextVariant.BodyMd} color={TextColor.Error}>
              {errorMsg}
            </Text>
          ) : (
            <>
              <ActivityIndicator size="large" />
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-4"
              >
                {strings('ledger.looking_for_device')}
              </Text>
            </>
          )}
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <>
      <AccountSelectionFlow
        accounts={displayAccounts}
        errorMessage={errorMsg}
        isBusy={blockingModalVisible}
        onBack={navigation.goBack}
        onContinue={handleContinue}
        onForget={handleForget}
        onNextPage={nextPage}
        onOpenSettings={openHdPathSheet}
        onPrevPage={prevPage}
        onToggleAccount={toggleAccountSelection}
      />
      <BlockingActionModal
        modalVisible={blockingModalVisible}
        isLoadingAction
        onAnimationCompleted={onAnimationCompleted}
      >
        <Text>{strings('common.please_wait')}</Text>
      </BlockingActionModal>
    </>
  );
};

export default LedgerSelectAccount;
