import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';

import Routes from '../../../constants/navigation/Routes';
import { useHardwareWallet } from '../../../core/HardwareWallet';
import type { DiscoveredDevice } from '../../../core/HardwareWallet/types';

import HardwareWalletTestIds from './hardwareWallet.testIds';
import {
  DeviceFoundState,
  DeviceNotFoundState,
  LookingForDeviceState,
  SelectDeviceSheet,
} from './components';

const HardwareWallet = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isConnectingToSelectedDevice, setIsConnectingToSelectedDevice] =
    useState(false);
  const didNavigateRef = useRef(false);
  const didStartFlowRef = useRef(false);
  const isMountedRef = useRef(true);
  const closeConnectionFlowRef = useRef<() => void>(() => undefined);
  const setConnectionSheetVisibleRef = useRef<(isVisible: boolean) => void>(
    () => undefined,
  );

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
    if (!deviceSelection.selectedDevice && deviceSelection.devices.length === 1) {
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
    setTargetWalletType(HardwareWalletType.Ledger);
    ensureDeviceReady().catch(() => false);
  }, [ensureDeviceReady, setConnectionSheetVisible, setTargetWalletType]);

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
      setConnectionSheetVisible(true);

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
      setConnectionSheetVisible,
    ],
  );

  const handleRetry = useCallback(() => {
    closeConnectionFlow();
    setConnectionSheetVisible(false);
    setTargetWalletType(HardwareWalletType.Ledger);
    ensureDeviceReady().catch(() => false);
  }, [
    closeConnectionFlow,
    ensureDeviceReady,
    setConnectionSheetVisible,
    setTargetWalletType,
  ]);

  const isErrorState = connectionState.status === ConnectionStatus.ErrorState;
  const hasDiscoveredDevices = deviceSelection.devices.length > 0;
  const isBusy =
    isConnectingToSelectedDevice ||
    connectionState.status === ConnectionStatus.Connecting ||
    connectionState.status === ConnectionStatus.Connected ||
    connectionState.status === ConnectionStatus.AwaitingApp;

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box twClassName="flex-1 items-center justify-center px-4">
        {isErrorState ? (
          <DeviceNotFoundState onRetry={handleRetry} />
        ) : hasDiscoveredDevices ? (
          displayDevice ? (
            <DeviceFoundState
              deviceName={displayDevice.name}
              disabled={isBusy}
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
