import { useEffect, useRef, useState } from 'react';
import { strings } from '../../../../locales/i18n';
import { BluetoothInterface } from './useBluetoothDevices';
import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../../core/Ledger/Ledger';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import { LedgerCommunicationErrors } from '../../../core/Ledger/ledgerErrors';

class LedgerError extends Error {
  public readonly code: LedgerCommunicationErrors;

  constructor(message: string, code: LedgerCommunicationErrors) {
    super(message);
    this.code = code;
  }
}

type LedgerLogicToRunType = (transport: BluetoothInterface) => Promise<void>;

interface UseLedgerBluetoothHook {
  isSendingLedgerCommands: boolean;
  isAppLaunchConfirmationNeeded: boolean;
  ledgerLogicToRun: (func: LedgerLogicToRunType) => Promise<void>;
  error?: LedgerCommunicationErrors;
  cleanupBluetoothConnection: () => void;
}

const RESTART_LIMIT = 5;

// Assumptions
// 1. One big code block - logic all encapsulated in logicToRun
// 2. logicToRun calls setUpBluetoothConnection
function useLedgerBluetooth(deviceId: string): UseLedgerBluetoothHook {
  // This is to track if we are expecting code to run or connection operational
  const [isSendingLedgerCommands, setIsSendingLedgerCommands] =
    useState<boolean>(false);

  const [isAppLaunchConfirmationNeeded, setIsAppLaunchConfirmationNeeded] =
    useState<boolean>(false);

  const transportRef = useRef<BluetoothInterface>();
  const restartConnectionState = useRef<{
    shouldRestartConnection: boolean;
    restartCount: number;
  }>({
    shouldRestartConnection: false,
    restartCount: 0,
  });

  // Due to the async nature of the disconnects after sending an APDU command we load the code to run in a stack
  // with code being pushed and popped off of the stack
  const workflowSteps = useRef<(() => Promise<void>)[]>([]);
  const [ledgerError, setLedgerError] = useState<LedgerCommunicationErrors>();

  const setLedgerErrorWithLog = (
    error: LedgerCommunicationErrors | undefined,
  ) => {
    console.log('[DEBUG useLedgerBluetooth] setLedgerError:', error);
    setLedgerError(error);
  };

  const resetConnectionState = () => {
    restartConnectionState.current.restartCount = 0;
    restartConnectionState.current.shouldRestartConnection = false;
    workflowSteps.current = [];
    setIsSendingLedgerCommands(false);
  };

  useEffect(
    () => () => {
      if (transportRef.current) {
        resetConnectionState();
        transportRef.current.close();
      }
    },
    [],
  );

  // Sets up the Bluetooth transport
  const setUpBluetoothConnection = async () => {
    if (transportRef.current && deviceId) {
      setIsSendingLedgerCommands(true);
    }

    if (!transportRef.current && deviceId) {
      try {
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BluetoothTransport: any = await import(
          '@ledgerhq/react-native-hw-transport-ble'
        );
        transportRef.current = await BluetoothTransport.default.open(deviceId);
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transportRef.current?.on('disconnect', () => {
          transportRef.current = undefined;
          // Restart connection if more code is to be run
          if (
            workflowSteps.current.length > 0 &&
            restartConnectionState.current.restartCount < RESTART_LIMIT &&
            restartConnectionState.current.shouldRestartConnection
          ) {
            restartConnectionState.current.restartCount += 1;

            const funcAfterDisconnect = workflowSteps.current.pop();
            if (!funcAfterDisconnect) {
              return setLedgerError(LedgerCommunicationErrors.UnknownError);
            }

            return funcAfterDisconnect();
          }

          // In case we somehow end up in an infinite loop or bluetooth connection is faulty
          if (restartConnectionState.current.restartCount === RESTART_LIMIT) {
            setLedgerErrorWithLog(LedgerCommunicationErrors.LedgerDisconnected);
          }

          // Reset all connection states
          resetConnectionState();
        });

        // We set this after the bluetooth connection has been established to be defensive
        setIsSendingLedgerCommands(true);
      } catch (e) {
        console.log(
          '[DEBUG useLedgerBluetooth] Caught error in setUpBluetoothConnection:',
          e,
        );
        // Reset all connection states
        resetConnectionState();
        setLedgerErrorWithLog(LedgerCommunicationErrors.LedgerDisconnected);
      }
    }
  };

  // Helper to add timeout to async operations as a safety net
  // The main lock detection is done via status codes, but BLE can sometimes hang
  const withTimeout = async <T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> => {
    const timeoutError = new Error(errorMessage);
    timeoutError.name = 'LedgerTimeoutError';

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(timeoutError), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  };

  // 10 second timeout as safety net - primary lock detection is via status codes
  const LEDGER_OPERATION_TIMEOUT_MS = 10000;

  const processLedgerWorkflow = async () => {
    console.log(
      '[DEBUG useLedgerBluetooth] processLedgerWorkflow started, deviceId:',
      deviceId,
    );
    try {
      // Must do this at start of every code block to run to ensure transport is set
      await setUpBluetoothConnection();
      console.log(
        '[DEBUG useLedgerBluetooth] setUpBluetoothConnection done, transportRef.current:',
        !!transportRef.current,
      );

      // If transport setup failed, setUpBluetoothConnection already set the error
      // and called resetConnectionState. Don't throw another error.
      if (!transportRef.current) {
        console.log('[DEBUG useLedgerBluetooth] No transport, returning early');
        return;
      }
      // Initialise the keyring and check for pre-conditions (is the correct app running?)
      // This call will return LockedDeviceError (0x5515) if device is locked
      // Timeout is a safety net in case BLE transport hangs completely
      // Note: When device is locked, BLE connects but APDU commands hang - no way to detect instantly
      console.log(
        '[DEBUG useLedgerBluetooth] About to call connectLedgerHardware with timeout',
      );
      const appName = await withTimeout(
        connectLedgerHardware(
          transportRef.current as unknown as BleTransport,
          deviceId,
        ),
        LEDGER_OPERATION_TIMEOUT_MS,
        'Ledger device: Device unresponsive. Please check if your device is unlocked and the Ethereum app is open.',
      );
      console.log(
        '[DEBUG useLedgerBluetooth] connectLedgerHardware returned appName:',
        appName,
      );

      // BOLOS is the Ledger main screen app
      if (appName === 'BOLOS') {
        // Open Ethereum App
        try {
          setIsAppLaunchConfirmationNeeded(true);
          await openEthereumAppOnLedger();
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          if (e.name === 'TransportStatusError') {
            switch (e.statusCode) {
              case 0x6984:
              case 0x6807:
                throw new LedgerError(
                  strings('ledger.ethereum_app_not_installed_error'),
                  LedgerCommunicationErrors.AppIsNotInstalled,
                );
              case 0x6985:
              case 0x5501:
                throw new LedgerError(
                  strings('ledger.ethereum_app_unconfirmed_error'),
                  LedgerCommunicationErrors.UserRefusedConfirmation,
                );
            }
          }

          throw new LedgerError(
            strings('ledger.ethereum_app_open_error'),
            LedgerCommunicationErrors.FailedToOpenApp,
          );
        } finally {
          setIsAppLaunchConfirmationNeeded(false);
        }

        workflowSteps.current.push(processLedgerWorkflow);
        restartConnectionState.current.shouldRestartConnection = true;

        return;
      } else if (appName !== 'Ethereum') {
        try {
          await closeRunningAppOnLedger();
        } catch (e) {
          throw new LedgerError(
            strings('ledger.running_app_close_error'),
            LedgerCommunicationErrors.FailedToCloseApp,
          );
        }

        workflowSteps.current.push(processLedgerWorkflow);
        restartConnectionState.current.shouldRestartConnection = true;

        return;
      }

      // Should now be on the Ethereum app if reached this point
      if (workflowSteps.current.length === 1) {
        const finalLogicFunc = workflowSteps.current.pop();
        if (!finalLogicFunc) {
          throw new Error('finalLogicFunc is undefined inside workflowSteps.');
        }
        return await finalLogicFunc();
      }
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.log(
        '[DEBUG useLedgerBluetooth] Caught error in processLedgerWorkflow:',
        e?.name,
        e?.statusCode,
        e?.message,
      );
      if (e.name === 'TransportStatusError') {
        switch (e.statusCode) {
          case 0x6985:
          case 0x5501:
            setLedgerErrorWithLog(
              LedgerCommunicationErrors.UserRefusedConfirmation,
            );
            break;
          case 0x6b0c:
            setLedgerErrorWithLog(LedgerCommunicationErrors.LedgerIsLocked);
            break;
          default:
            setLedgerErrorWithLog(
              LedgerCommunicationErrors.UserRefusedConfirmation,
            );
            break;
        }
      } else if (
        e.name === 'DisconnectedDevice' ||
        e.name === 'DisconnectedDeviceDuringOperation'
      ) {
        setLedgerErrorWithLog(LedgerCommunicationErrors.LedgerDisconnected);
      } else if (e.name === 'LedgerTimeoutError') {
        // Timeout means device is unresponsive - could be locked or BLE issue
        setLedgerErrorWithLog(LedgerCommunicationErrors.DeviceUnresponsive);
      } else if (e.name === 'TransportRaceCondition') {
        setLedgerErrorWithLog(
          LedgerCommunicationErrors.LedgerHasPendingConfirmation,
        );
      } else if (e instanceof LedgerError) {
        // We are throwing thse with the proper error codes already set
        setLedgerErrorWithLog(e.code);
      } else if (
        e.message.includes('Only version 4 of typed data signing is supported')
      ) {
        setLedgerErrorWithLog(LedgerCommunicationErrors.NotSupported);
      } else if (e.message.includes('Ledger device: Locked device')) {
        setLedgerErrorWithLog(LedgerCommunicationErrors.LedgerIsLocked);
      } else if (e.message.includes('nonce too low')) {
        setLedgerErrorWithLog(LedgerCommunicationErrors.NonceTooLow);
      } else if (
        e.message.includes(
          'Please enable Blind signing or Contract data in the Ethereum app Settings',
        )
      ) {
        setLedgerErrorWithLog(LedgerCommunicationErrors.BlindSignError);
      } else {
        setLedgerErrorWithLog(LedgerCommunicationErrors.UnknownError);
      }

      resetConnectionState();
    }
  };

  return {
    isSendingLedgerCommands,
    isAppLaunchConfirmationNeeded,
    ledgerLogicToRun: async (func) => {
      console.log(
        '[DEBUG useLedgerBluetooth] ledgerLogicToRun called, deviceId:',
        deviceId,
      );
      // Reset error
      setLedgerError(undefined);
      // Add code block as last item in stack
      workflowSteps.current.push(() =>
        func(transportRef.current as BluetoothInterface),
      );
      //  Start off workflow
      processLedgerWorkflow();
    },
    error: ledgerError,
    cleanupBluetoothConnection: resetConnectionState,
  };
}

export default useLedgerBluetooth;
