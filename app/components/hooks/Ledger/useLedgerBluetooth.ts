import { useEffect, useRef, useState } from 'react';
import { strings } from '../../../../locales/i18n';
import { BluetoothInterface } from './useBluetoothDevices';
import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../../core/Ledger/Ledger';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import {
  LedgerCommunicationErrors,
  isEthAppNotOpenStatusCode,
  isEthAppNotOpenErrorMessage,
  isDisconnectError,
} from '../../../core/Ledger/ledgerErrors';
import loadBleTransport from './loadBleTransport';

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

export { isDisconnectError };

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
    restartCount: number;
  }>({
    restartCount: 0,
  });

  // Due to the async nature of the disconnects after sending an APDU command we load the code to run in a stack
  // with code being pushed and popped off of the stack
  const workflowSteps = useRef<(() => Promise<void>)[]>([]);
  const isReconnecting = useRef(false);
  const [ledgerError, setLedgerError] = useState<LedgerCommunicationErrors>();

  const resetConnectionState = () => {
    restartConnectionState.current.restartCount = 0;
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
        transportRef.current = await loadBleTransport(deviceId);
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transportRef.current?.on('disconnect', () => {
          transportRef.current = undefined;

          // When we're handling an app switch directly via recursive
          // processLedgerWorkflow, don't interfere with the workflow state.
          if (isReconnecting.current) {
            return;
          }

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

  const processLedgerWorkflow = async (): Promise<void> => {
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

          if (!isDisconnectError(e)) {
            throw new LedgerError(
              strings('ledger.ethereum_app_open_error'),
              LedgerCommunicationErrors.FailedToOpenApp,
            );
          }
        } finally {
          setIsAppLaunchConfirmationNeeded(false);
        }

        // Whether openEthereumAppOnLedger succeeded (BLE stayed connected)
        // or threw a disconnect error (transport already gone), the Ledger
        // is now switching to the Ethereum app. Guard against a late BLE
        // disconnect clearing our workflowSteps, wait for the app to load,
        // then re-enter processLedgerWorkflow directly.
        isReconnecting.current = true;
        await new Promise((r) => setTimeout(r, 1000));
        isReconnecting.current = false;

        restartConnectionState.current.restartCount += 1;
        if (restartConnectionState.current.restartCount >= RESTART_LIMIT) {
          throw new LedgerError(
            strings('ledger.ethereum_app_open_error'),
            LedgerCommunicationErrors.FailedToOpenApp,
          );
        }

        return await processLedgerWorkflow();
      } else if (appName !== 'Ethereum') {
        try {
          await closeRunningAppOnLedger();
        } catch (e) {
          if (!isDisconnectError(e)) {
            throw new LedgerError(
              strings('ledger.running_app_close_error'),
              LedgerCommunicationErrors.FailedToCloseApp,
            );
          }
        }

        isReconnecting.current = true;
        await new Promise((r) => setTimeout(r, 1000));
        isReconnecting.current = false;

        restartConnectionState.current.restartCount += 1;
        if (restartConnectionState.current.restartCount >= RESTART_LIMIT) {
          throw new LedgerError(
            strings('ledger.running_app_close_error'),
            LedgerCommunicationErrors.FailedToCloseApp,
          );
        }

        return await processLedgerWorkflow();
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
          default:
            // Check if it's an ETH app not open error before falling back to UserRefusedConfirmation
            if (isEthAppNotOpenStatusCode(e.statusCode)) {
              setLedgerError(LedgerCommunicationErrors.EthAppNotOpen);
            } else {
              setLedgerError(LedgerCommunicationErrors.UserRefusedConfirmation);
            }
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
      } else if (isEthAppNotOpenErrorMessage(e.message)) {
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
      await processLedgerWorkflow();
    },
    error: ledgerError,
    cleanupBluetoothConnection: resetConnectionState,
  };
}

export default useLedgerBluetooth;
