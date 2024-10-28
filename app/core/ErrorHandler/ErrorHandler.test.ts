import { getReactNativeDefaultHandler, handleCustomError, setReactNativeDefaultHandler } from './ErrorHandler';
import { ErrorHandlerCallback } from 'react-native';

describe('ErrorHandler', () => {
  const mockHandler: ErrorHandlerCallback = jest.fn();

  it('sets the default error handler', () => {
    setReactNativeDefaultHandler(mockHandler);
    expect(getReactNativeDefaultHandler()).toBe(mockHandler);
  });

  it('handles Ledger error without crashing the app', () => {
    const mockError = { name: 'EthAppPleaseEnableContractData', message: 'Enable contract data' };
    console.error = jest.fn();
    handleCustomError(mockError, true);
    expect(console.error).toHaveBeenCalledWith('Ledger error: ', 'Enable contract data');
  });

  it('passes non-Ledger error to the default handler', () => {
    setReactNativeDefaultHandler(mockHandler);
    const mockError = new Error('Some other error');
    handleCustomError(mockError, true);
    expect(mockHandler).toHaveBeenCalledWith(mockError, true);
  });

  it('handles TransportStatusError without crashing the app', () => {
    const mockError = { name: 'TransportStatusError', message: 'Transport error' };
    console.error = jest.fn();
    handleCustomError(mockError, true);
    expect(console.error).toHaveBeenCalledWith('Ledger error: ', 'Transport error');
  });
});
