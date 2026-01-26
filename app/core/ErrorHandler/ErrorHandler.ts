import { ErrorHandlerCallback } from 'react-native';

let reactNativeDefaultHandler: ErrorHandlerCallback;

/**
 * Set the default error handler from react-native
 * @param handler
 */
export const setReactNativeDefaultHandler = (handler: ErrorHandlerCallback) => {
  reactNativeDefaultHandler = handler;
};

export const handleCustomError = (error: Error, isFatal: boolean) => {
  // Check whether the error is from the Ledger native bluetooth errors.
  if (
    error.name === 'EthAppPleaseEnableContractData' ||
    error.name === 'TransportStatusError' ||
    error.name === 'DisconnectedDevice' ||
    error.name === 'DisconnectedDeviceDuringOperation' ||
    error.name === 'BleError' ||
    error.name === 'TransportError' ||
    error.name === 'TransportLocked' ||
    error.name === 'LockedDeviceError'
  ) {
    // dont pass the error to react native error handler to prevent app crash
    console.error('Ledger error: ', error.message);
    // check error message contain "KeystoneError#Tx_canceled"
  } else if (
    error.name === 'Error' &&
    error.message?.includes('KeystoneError#Tx_canceled')
  ) {
    console.error('Keystone error: ', error.message);
  } else {
    // Pass the error to react native error handler
    reactNativeDefaultHandler(error, isFatal);
  }
};

export const getReactNativeDefaultHandler = () => reactNativeDefaultHandler;
