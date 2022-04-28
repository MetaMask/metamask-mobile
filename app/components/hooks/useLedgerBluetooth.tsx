import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import BluetoothTransport from '@ledgerhq/react-native-hw-transport-ble';

import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';

type LedgerLogicToRunType = (transport: BluetoothTransport) => Promise<void>;

interface UseLedgerBluetoothHook {
	isSendingLedgerCommands: boolean;
	ledgerLogicToRun: (func: LedgerLogicToRunType) => Promise<void>;
	ledgerErrorMessage: string | undefined;
	cleanupBluetoothConnection: () => void;
}

const RESTART_LIMIT = 5;

// Assumptions
// 1. One big code block - logic all encapsulated in logicToRun
// 2. logicToRun calls setUpBluetoothConnection
function useLedgerBluetooth(deviceId?: string): UseLedgerBluetoothHook {
	const { KeyringController } = Engine.context as any;

	// This is to track if we are expecting code to run or connection operational
	const [isSendingLedgerCommands, setIsSendingLedgerCommands] = useState<boolean>(false);

	const transportRef = useRef<BluetoothTransport>();
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
	const [ledgerError, setLedgerError] = useState<string | undefined>();

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
		[]
	);

	// Sets up the Bluetooth transport
	const setUpBluetoothConnection = async () => {
		if (!transportRef.current && deviceId) {
			try {
				transportRef.current = await BluetoothTransport.open(deviceId);
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
							return setLedgerError(
								strings('ledger.bluetooth_connection_failed') + strings('ledger.unknown_code_error')
							);
						}

						return funcAfterDisconnect();
					}

					// In case we somehow end up in an infinite loop or bluetooth connection is faulty
					if (restartConnectionState.current.restartCount === RESTART_LIMIT) {
						setLedgerError(
							strings('ledger.bluetooth_connection_failed') +
								strings('ledger.bluetooth_connection_failed_message')
						);
					}

					// Reset all connection states
					resetConnectionState();
				});

				// We set this after the bluetooth connection has been established to be defensive
				setIsSendingLedgerCommands(true);
			} catch (e) {
				// Reset all connection states
				resetConnectionState();

				setLedgerError(
					strings('ledger.bluetooth_connection_failed') +
						strings('ledger.bluetooth_connection_failed_message')
				);
			}
		}
	};

	const processLedgerWorkflow = async () => {
		try {
			// Must do this at start of every code block to run to ensure transport is set
			await setUpBluetoothConnection();

			// Initialise the keyring and check for pre-conditions (is the correct app running?)
			const appName = await KeyringController.connectLedgerHardware(transportRef.current, deviceId);

			// BOLOS is the Ledger main screen app
			if (appName === 'BOLOS') {
				// Open Ethereum App
				// Alert.alert(strings('ledger.ethereum_app_open'), strings('ledger.ethereum_app_open_message'));
				try {
					await KeyringController.openEthereumApp();
				} catch (e) {
					throw new Error(strings('ledger.ethereum_app_open_error'));
				}
				workflowSteps.current.push(processLedgerWorkflow);
				restartConnectionState.current.shouldRestartConnection = true;

				return;
			} else if (appName !== 'Ethereum') {
				await KeyringController.closeRunningApp();

				workflowSteps.current.push(processLedgerWorkflow);
				restartConnectionState.current.shouldRestartConnection = true;

				return;
			}

			// Should now be on the Ethereum app if reached this point
			if (workflowSteps.current.length === 1) {
				const finalLogicFunc = workflowSteps.current.pop();
				if (!finalLogicFunc) {
					throw new Error(strings('ledger.unknown_code_error'));
				}
				return await finalLogicFunc();
			}
		} catch (e: any) {
			let errorMessage = e.message;

			if (e.name === 'TransportStatusError' && e.message.includes('0x6b0c')) {
				errorMessage = strings('ledger.unlock_ledger_message');
			}

			Alert.alert(strings('ledger.cannot_get_account'), errorMessage);
			resetConnectionState();
			setLedgerError(errorMessage);
		}
	};

	return {
		isSendingLedgerCommands,
		ledgerLogicToRun: async (func) => {
			// Reset error
			setLedgerError(undefined);
			// Add code block as last item in stack
			workflowSteps.current.push(() => func(transportRef.current as BluetoothTransport));
			//  Start off workflow
			processLedgerWorkflow();
		},
		ledgerErrorMessage: ledgerError,
		cleanupBluetoothConnection: resetConnectionState,
	};
}

export default useLedgerBluetooth;
