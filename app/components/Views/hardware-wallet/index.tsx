import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import {
  ConnectionStatus,
  ErrorCode,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';

import Routes from '../../../constants/navigation/Routes';
import { useHardwareWallet } from '../../../core/HardwareWallet';
import type { DiscoveredDevice } from '../../../core/HardwareWallet/types';

import {
  DeviceFoundState,
  LookingForDeviceState,
  SelectDeviceSheet,
} from './components';
import { resolveErrorComponent } from './errors';

const HardwareWallet = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const tw = useTailwind();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isConnectingToSelectedDevice, setIsConnectingToSelectedDevice] =
    useState(false);
  const didNavigateRef = useRef(false);
  const didStartFlowRef = useRef(false);
  const isMountedRef = useRef(true);
  const isRetryingErrorActionRef = useRef(false);
  const closeConnectionFlowRef = useRef<() => void>(() => undefined);
  const setConnectionSheetVisibleRef = useRef<(isVisible: boolean) => void>(
    () => undefined,
  );

  const walletType = ((route.params as Record<string, unknown> | undefined)
    ?.walletType ?? HardwareWalletType.Ledger) as HardwareWalletType;

  const {
    connectionState,
    deviceSelection,
    ensureDeviceReady,
    setTargetWalletType,
    selectDiscoveredDevice,
    connectToDevice,
    closeConnectionFlow,
    acknowledgeConnectionSuccess,
    setConnectionSheetVisible,
  } = useHardwareWallet();

  const displayDevice = useMemo(
    () => deviceSelection.selectedDevice ?? deviceSelection.devices[0] ?? null,
    [deviceSelection.devices, deviceSelection.selectedDevice],
  );

  useEffect(() => {
    closeConnectionFlowRef.current = closeConnectionFlow;
    setConnectionSheetVisibleRef.current = setConnectionSheetVisible;
  }, [closeConnectionFlow, setConnectionSheetVisible]);

  useEffect(() => {
    if (
      !deviceSelection.selectedDevice &&
      deviceSelection.devices.length === 1
    ) {
      selectDiscoveredDevice(deviceSelection.devices[0]);
    }
  }, [
    deviceSelection.devices,
    deviceSelection.selectedDevice,
    selectDiscoveredDevice,
  ]);

  useEffect(() => {
    if (didStartFlowRef.current) {
      return;
    }

    didStartFlowRef.current = true;
    setConnectionSheetVisible(false);
    setTargetWalletType(walletType);
    ensureDeviceReady().catch(() => false);
  }, [
    ensureDeviceReady,
    setConnectionSheetVisible,
    setTargetWalletType,
    walletType,
  ]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      setConnectionSheetVisibleRef.current(true);
      if (!didNavigateRef.current) {
        closeConnectionFlowRef.current();
      }
    },
    [],
  );

  const handleSelectedDevice = useCallback(
    async (selectedDevice: DiscoveredDevice) => {
      if (isConnectingToSelectedDevice) {
        return;
      }

      setIsSelectorOpen(false);
      setIsConnectingToSelectedDevice(true);
      selectDiscoveredDevice(selectedDevice);

      try {
        const isConnected = await connectToDevice(selectedDevice.id);
        if (isConnected && isMountedRef.current) {
          acknowledgeConnectionSuccess();
          didNavigateRef.current = true;
          navigation.dispatch(StackActions.replace(Routes.HW.LEDGER_CONNECT));
        }
      } finally {
        if (isMountedRef.current) {
          setIsConnectingToSelectedDevice(false);
        }
      }
    },
    [
      acknowledgeConnectionSuccess,
      connectToDevice,
      isConnectingToSelectedDevice,
      navigation,
      selectDiscoveredDevice,
    ],
  );

  const handleNavigateToLedgerConnect = useCallback(() => {
    acknowledgeConnectionSuccess();
    didNavigateRef.current = true;
    navigation.dispatch(StackActions.replace(Routes.HW.LEDGER_CONNECT));
  }, [acknowledgeConnectionSuccess, navigation]);

  const handleRestartFlow = useCallback(() => {
    closeConnectionFlow();
    setConnectionSheetVisible(false);
    setTargetWalletType(walletType);
    ensureDeviceReady().catch(() => false);
  }, [
    closeConnectionFlow,
    ensureDeviceReady,
    setConnectionSheetVisible,
    setTargetWalletType,
    walletType,
  ]);

  const retryTargetDeviceId = displayDevice?.id ?? null;

  const handleRetryCurrentDevice = useCallback(async () => {
    if (isRetryingErrorActionRef.current) {
      return;
    }

    if (!retryTargetDeviceId && !deviceSelection.selectedDevice) {
      handleRestartFlow();
      return;
    }

    isRetryingErrorActionRef.current = true;
    setIsConnectingToSelectedDevice(true);
    setConnectionSheetVisible(false);

    try {
      const isConnected = await ensureDeviceReady(retryTargetDeviceId);
      if (isConnected && isMountedRef.current) {
        handleNavigateToLedgerConnect();
      }
    } finally {
      isRetryingErrorActionRef.current = false;
      if (isMountedRef.current) {
        setIsConnectingToSelectedDevice(false);
      }
    }
  }, [
    deviceSelection.selectedDevice,
    ensureDeviceReady,
    handleNavigateToLedgerConnect,
    handleRestartFlow,
    retryTargetDeviceId,
    setConnectionSheetVisible,
  ]);

  const handleContinue = useCallback(() => {
    handleRetryCurrentDevice();
  }, [handleRetryCurrentDevice]);

  const handleExitErrorFlow = useCallback(() => {
    didNavigateRef.current = true;
    closeConnectionFlow();
    navigation.goBack();
  }, [closeConnectionFlow, navigation]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings().catch(() => undefined);
  }, []);

  const handleOpenBluetoothSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:Bluetooth').catch(() => {
        Linking.openSettings().catch(() => undefined);
      });
      return;
    }

    Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => {
      Linking.openSettings().catch(() => undefined);
    });
  }, []);

  const isErrorState = connectionState.status === ConnectionStatus.ErrorState;
  const connectionError = isErrorState ? connectionState.error : undefined;
  const errorCode = connectionError?.code;
  const shouldShowAppClosedState =
    connectionState.status === ConnectionStatus.AwaitingApp ||
    errorCode === ErrorCode.DeviceStateEthAppClosed ||
    errorCode === ErrorCode.DeviceMissingCapability;
  const hasDiscoveredDevices = deviceSelection.devices.length > 0;
  const isBusy =
    isConnectingToSelectedDevice ||
    connectionState.status === ConnectionStatus.Connecting ||
    connectionState.status === ConnectionStatus.Connected ||
    connectionState.status === ConnectionStatus.AwaitingApp;

  const ErrorComponent = resolveErrorComponent(
    walletType,
    shouldShowAppClosedState ? ErrorCode.DeviceStateEthAppClosed : errorCode,
  );

  const containerClassName =
    isErrorState &&
    errorCode !== undefined &&
    errorCode !== ErrorCode.DeviceNotFound
      ? 'flex-1 w-full'
      : 'flex-1 items-center justify-center px-4';

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box twClassName={containerClassName}>
        {shouldShowAppClosedState || isErrorState ? (
          <ErrorComponent
            errorCode={errorCode ?? ErrorCode.Unknown}
            error={connectionError}
            isBusy={isBusy}
            onRetry={handleRetryCurrentDevice}
            onContinue={handleContinue}
            onExit={handleExitErrorFlow}
            onOpenSettings={handleOpenSettings}
            onOpenBluetoothSettings={handleOpenBluetoothSettings}
          />
        ) : hasDiscoveredDevices ? (
          displayDevice ? (
            <DeviceFoundState
              deviceName={displayDevice.name}
              disabled={isBusy}
              onConnect={() => handleSelectedDevice(displayDevice)}
              onOpenSelector={() => setIsSelectorOpen(true)}
            />
          ) : null
        ) : (
          <LookingForDeviceState />
        )}
      </Box>

      {isSelectorOpen ? (
        <SelectDeviceSheet
          devices={deviceSelection.devices}
          selectedDeviceId={displayDevice?.id}
          onClose={() => setIsSelectorOpen(false)}
          onSelectDevice={handleSelectedDevice}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default HardwareWallet;
