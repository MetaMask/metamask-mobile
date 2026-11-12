import {
  getReactNativeDefaultHandler,
  handleCustomError,
  setReactNativeDefaultHandler,
} from './ErrorHandler';
import { ErrorHandlerCallback } from 'react-native';

describe('ErrorHandler', () => {
  const mockHandler: ErrorHandlerCallback = jest.fn();

  it('sets the default error handler', () => {
    setReactNativeDefaultHandler(mockHandler);
    expect(getReactNativeDefaultHandler()).toBe(mockHandler);
  });

  it('handles Ledger error without crashing the app', () => {
    const mockError = {
      name: 'EthAppPleaseEnableContractData',
      message: 'Enable contract data',
    };
    console.error = jest.fn();
    handleCustomError(mockError, true);
    expect(console.error).toHaveBeenCalledWith(
      'Ledger error: ',
      'Enable contract data',
    );
  });

  it('passes non-Ledger error to the default handler', () => {
    setReactNativeDefaultHandler(mockHandler);
    const mockError = new Error('Some other error');
    handleCustomError(mockError, true);
    expect(mockHandler).toHaveBeenCalledWith(mockError, true);
  });

  it('handles TransportStatusError without crashing the app', () => {
    const mockError = {
      name: 'TransportStatusError',
      message: 'Transport error',
    };
    console.error = jest.fn();
    handleCustomError(mockError, true);
    expect(console.error).toHaveBeenCalledWith(
      'Ledger error: ',
      'Transport error',
    );
  });

  it('handles KeystoneError#Tx_canceled without crashing the app', () => {
    const mockError = { name: 'Error', message: 'KeystoneError#Tx_canceled' };
    console.error = jest.fn();
    handleCustomError(mockError, true);
    expect(console.error).toHaveBeenCalledWith(
      'Keystone error: ',
      'KeystoneError#Tx_canceled',
    );
  });

  it('handles DisconnectedDevice error without crashing the app', () => {
    const mockError = {
      name: 'DisconnectedDevice',
      message: 'DisconnectedDevice',
    };
    console.error = jest.fn();
    handleCustomError(mockError, true);
    expect(console.error).toHaveBeenCalledWith(
      'Ledger error: ',
      'DisconnectedDevice',
    );
  });

  it('handles a Ledger Bluetooth BleError without crashing the app', () => {
    const defaultHandler = jest.fn();
    setReactNativeDefaultHandler(defaultHandler);
    const mockError = {
      name: 'BleError',
      message: 'Device D1:A3:7C:42:9E:10 was disconnected',
    };
    console.error = jest.fn();

    handleCustomError(mockError, true);

    expect(defaultHandler).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      'Ledger error: ',
      'Device D1:A3:7C:42:9E:10 was disconnected',
    );
  });
});
