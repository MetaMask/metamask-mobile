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

function classifyTransportStatusError(
  statusCode: number,
): LedgerCommunicationErrors {
  switch (statusCode) {
    case 0x6985:
    case 0x5501:
      return LedgerCommunicationErrors.UserRefusedConfirmation;
    case 0x6b0c:
      return LedgerCommunicationErrors.LedgerIsLocked;
    default:
      return isEthAppNotOpenStatusCode(statusCode)
        ? LedgerCommunicationErrors.EthAppNotOpen
        : LedgerCommunicationErrors.UserRefusedConfirmation;
  }
}

function classifyErrorByMessage(message: string): LedgerCommunicationErrors {
  if (message.includes('Only version 4 of typed data signing is supported')) {
    return LedgerCommunicationErrors.NotSupported;
  }
  if (message.includes('Ledger device: Locked device')) {
    return LedgerCommunicationErrors.LedgerIsLocked;
  }
  if (message.includes('nonce too low')) {
    return LedgerCommunicationErrors.NonceTooLow;
  }
  if (
    message.includes(
      'Please enable Blind signing or Contract data in the Ethereum app Settings',
    )
  ) {
    return LedgerCommunicationErrors.BlindSignError;
  }
  if (isEthAppNotOpenErrorMessage(message)) {
    return LedgerCommunicationErrors.EthAppNotOpen;
  }
  return LedgerCommunicationErrors.UnknownError;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function classifyLedgerError(e: any): LedgerCommunicationErrors {
  if (e instanceof LedgerError) {
    return e.code;
  }
  if (e.name === 'TransportStatusError') {
    return classifyTransportStatusError(e.statusCode);
  }
  if (e.name === 'TransportRaceCondition') {
    return LedgerCommunicationErrors.LedgerHasPendingConfirmation;
  }
  return classifyErrorByMessage(e.message);
}

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
    isReconnecting.current = false;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOpenEthAppError = (e: any): void => {
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
  };

  const handleBolosApp = async (): Promise<void> => {
    isReconnecting.current = true;
    try {
      setIsAppLaunchConfirmationNeeded(true);
      await openEthereumAppOnLedger();
    } catch (e) {
      handleOpenEthAppError(e);
    } finally {
      setIsAppLaunchConfirmationNeeded(false);
    }
  };

  const handleNonEthereumApp = async (): Promise<void> => {
    isReconnecting.current = true;
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
  };

  async function waitAndRetry(
    errorMessage: string,
    errorCode: LedgerCommunicationErrors,
  ): Promise<void> {
    await new Promise((r) => setTimeout(r, 1000));
    isReconnecting.current = false;

    restartConnectionState.current.restartCount += 1;
    if (restartConnectionState.current.restartCount >= RESTART_LIMIT) {
      throw new LedgerError(errorMessage, errorCode);
    }

    return processLedgerWorkflow();
  }

  async function processLedgerWorkflow(): Promise<void> {
    try {
      await setUpBluetoothConnection();

      if (!transportRef.current) {
        throw new Error('transportRef.current is undefined');
      }

      const appName = await connectLedgerHardware(
        transportRef.current as unknown as BleTransport,
        deviceId,
      );

      if (appName === 'BOLOS') {
        await handleBolosApp();
        return await waitAndRetry(
          strings('ledger.ethereum_app_open_error'),
          LedgerCommunicationErrors.FailedToOpenApp,
        );
      }

      if (appName !== 'Ethereum') {
        await handleNonEthereumApp();
        return await waitAndRetry(
          strings('ledger.running_app_close_error'),
          LedgerCommunicationErrors.FailedToCloseApp,
        );
      }

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
      setLedgerError(classifyLedgerError(e));
      resetConnectionState();
    }
  }

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
