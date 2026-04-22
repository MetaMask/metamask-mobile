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
  // Suppress stream "Premature close" errors that bubble up as uncaught
  // exceptions when Snap WebView execution environments tear down.
  // These are benign teardown artifacts caused by readable-stream version
  // mismatches between @metamask packages and the pump/end-of-stream libs.
  if (
    error.message === 'Premature close' ||
    (error as NodeJS.ErrnoException).code === 'ERR_STREAM_PREMATURE_CLOSE'
  ) {
    return;
  }
  // Check whether the error is from the Ledger native bluetooth errors.
  if (
    error.name === 'EthAppPleaseEnableContractData' ||
    error.name === 'TransportStatusError' ||
    error.name === 'DisconnectedDevice'
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
