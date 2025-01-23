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
    if(error.name === 'EthAppPleaseEnableContractData' || error.name === 'TransportStatusError') {
      // dont pass the error to react native error handler to prevent app crash
      console.error('Ledger error: ', error.message);
      // Handle the error
    } else if ( error.message === 'Internal JSON-RPC error.'){
      // avoid passing RPC error to the error handler to prevent app crash
      console.error('RPC error: ', error);
    } else {
      // Pass the error to react native error handler
      reactNativeDefaultHandler(error, isFatal);
    }
};

export const getReactNativeDefaultHandler = () => reactNativeDefaultHandler;
