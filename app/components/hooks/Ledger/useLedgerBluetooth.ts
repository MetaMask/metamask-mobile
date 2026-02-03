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
            setLedgerError(LedgerCommunicationErrors.LedgerDisconnected);
          }

          // Reset all connection states
          resetConnectionState();
        });

        // We set this after the bluetooth connection has been established to be defensive
        setIsSendingLedgerCommands(true);
      } catch (e) {
        // Reset all connection states
        resetConnectionState();
        setLedgerError(LedgerCommunicationErrors.LedgerDisconnected);
      }
    }
  };

  const processLedgerWorkflow = async () => {
    try {
      // Must do this at start of every code block to run to ensure transport is set
      await setUpBluetoothConnection();

      if (!transportRef.current) {
        throw new Error('transportRef.current is undefined');
      }
      // Initialise the keyring and check for pre-conditions (is the correct app running?)
      const appName = await connectLedgerHardware(
        transportRef.current as unknown as BleTransport,
        deviceId,
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
      if (e.name === 'TransportStatusError') {
        switch (e.statusCode) {
          case 0x6985:
          case 0x5501:
            setLedgerError(LedgerCommunicationErrors.UserRefusedConfirmation);
            break;
          case 0x6b0c:
            setLedgerError(LedgerCommunicationErrors.LedgerIsLocked);
            break;
          case 0x6d00:
          case 0x6e00:
          case 0x6e01:
          case 0x6511:
          case 0x6700:
          case 0x650f:
            // ETH app is not running - various status codes indicate this
            setLedgerError(LedgerCommunicationErrors.EthAppNotOpen);
            break;
          default:
            setLedgerError(LedgerCommunicationErrors.UserRefusedConfirmation);
            break;
        }
      } else if (e.name === 'TransportRaceCondition') {
        setLedgerError(LedgerCommunicationErrors.LedgerHasPendingConfirmation);
      } else if (e instanceof LedgerError) {
        // We are throwing thse with the proper error codes already set
        setLedgerError(e.code);
      } else if (
        e.message.includes('Only version 4 of typed data signing is supported')
      ) {
        setLedgerError(LedgerCommunicationErrors.NotSupported);
      } else if (e.message.includes('Ledger device: Locked device')) {
        setLedgerError(LedgerCommunicationErrors.LedgerIsLocked);
      } else if (e.message.includes('nonce too low')) {
        setLedgerError(LedgerCommunicationErrors.NonceTooLow);
      } else if (
        e.message.includes(
          'Please enable Blind signing or Contract data in the Ethereum app Settings',
        )
      ) {
        setLedgerError(LedgerCommunicationErrors.BlindSignError);
      } else if (
        // Check for error messages that contain ETH app not open status codes
        e.message &&
        (e.message.includes('0x650f') ||
          e.message.includes('0x6511') ||
          e.message.includes('0x6d00') ||
          e.message.includes('0x6e00'))
      ) {
        setLedgerError(LedgerCommunicationErrors.EthAppNotOpen);
      } else {
        setLedgerError(LedgerCommunicationErrors.UnknownError);
      }

      resetConnectionState();
    }
  };

  return {
    isSendingLedgerCommands,
    isAppLaunchConfirmationNeeded,
    ledgerLogicToRun: async (func) => {
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
