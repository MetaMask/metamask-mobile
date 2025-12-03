import { InternalAccount } from '@metamask/keyring-internal-api';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import useBluetoothDevices from './useBluetoothDevices';
import useBluetoothPermissions from '../useBluetoothPermissions';
import useBluetooth from './useBluetooth';

/**
 * Hook to get Ledger device information for an account
 * Returns device info only for Ledger accounts
 */
const useLedgerDeviceForAccount = (selectedAccount: InternalAccount) => {
  const isLedgerAccount =
    selectedAccount?.metadata?.keyring?.type === ExtendedKeyringTypes.ledger;

  const {
    hasBluetoothPermissions,
    checkPermissions,
    bluetoothPermissionError,
  } = useBluetoothPermissions();

  const { bluetoothOn, bluetoothConnectionError } = useBluetooth(
    hasBluetoothPermissions,
  );

  const { devices, deviceScanError } = useBluetoothDevices(
    hasBluetoothPermissions,
    bluetoothOn,
  );

  return {
    ledgerDevice:
      isLedgerAccount && devices.length > 0 ? devices[0] : undefined,
    hasBluetoothPermissions: isLedgerAccount
      ? hasBluetoothPermissions
      : undefined,
    bluetoothOn: isLedgerAccount ? bluetoothOn : undefined,
    checkPermissions: isLedgerAccount ? checkPermissions : undefined,
    bluetoothPermissionError: isLedgerAccount
      ? bluetoothPermissionError
      : undefined,
    bluetoothConnectionError: isLedgerAccount
      ? bluetoothConnectionError
      : undefined,
    deviceScanError: isLedgerAccount ? deviceScanError : undefined,
  };
};

export default useLedgerDeviceForAccount;
