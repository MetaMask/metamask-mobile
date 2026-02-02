export enum LedgerCommunicationErrors {
  LedgerDisconnected = 'LedgerDisconnected',
  LedgerHasPendingConfirmation = 'LedgerHasPendingConfirmation',
  FailedToOpenApp = 'FailedToOpenApp',
  FailedToCloseApp = 'FailedToCloseApp',
  UserRefusedConfirmation = 'UserRefusedConfirmation',
  AppIsNotInstalled = 'AppIsNotInstalled',
  EthAppNotOpen = 'EthAppNotOpen',
  LedgerIsLocked = 'LedgerIsLocked',
  NotSupported = 'NotSupported',
  UnknownError = 'UnknownError',
  NonceTooLow = 'NonceTooLow',
  BlindSignError = 'BlindSignError',
}

export enum BluetoothPermissionErrors {
  BluetoothAccessBlocked = 'BluetoothAccessBlocked',
  LocationAccessBlocked = 'LocationAccessBlocked',
  NearbyDevicesAccessBlocked = 'NearbyDevicesAccessBlocked',
}
