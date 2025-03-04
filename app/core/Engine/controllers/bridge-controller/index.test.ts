import {
  BridgeClientId,
  BridgeController,
  type BridgeControllerMessenger,
} from '@metamask/bridge-controller';
import type { ControllerInitRequest, Controllers } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { bridgeControllerInit } from '.';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { TransactionParams } from '@metamask/transaction-controller';
import { ChainId } from '@metamask/controller-utils';
import { defaultBridgeControllerState } from './constants';

jest.mock('@metamask/bridge-controller');

describe('bridge controller init', () => {
  const bridgeControllerClassMock = jest.mocked(BridgeController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<BridgeControllerMessenger>
  >;

  // Define mock dependencies
  const mockFetch = jest.fn();
  const mockGetLayer1GasFee = jest.fn();
  // Create a minimal mock of the TransactionController
  const mockTransactionController = {
    getLayer1GasFee: mockGetLayer1GasFee,
  } as unknown as Controllers['TransactionController'];

  // Store the global fetch function
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();

    // Replace global fetch with mock
    global.fetch = mockFetch;

    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);

    // Mock getController to return mockTransactionController
    initRequestMock.getController.mockImplementation(
      (controllerName: keyof Controllers) => {
        if (controllerName === 'TransactionController') {
          return mockTransactionController;
        }
        return undefined as unknown as Controllers[typeof controllerName];
      },
    );
  });

  afterEach(() => {
    // Restore global fetch
    global.fetch = originalFetch;
  });

  it('returns controller instance', () => {
    expect(bridgeControllerInit(initRequestMock).controller).toBeInstanceOf(
      BridgeController,
    );
  });

  it('controller is initialized with the correct clientId', () => {
    bridgeControllerInit(initRequestMock);
    const bridgeControllerOptions = bridgeControllerClassMock.mock.calls[0][0];
    expect(bridgeControllerOptions.clientId).toBe(BridgeClientId.MOBILE);
  });

  it('controller is initialized with the fetch function', () => {
    bridgeControllerInit(initRequestMock);
    const bridgeControllerOptions = bridgeControllerClassMock.mock.calls[0][0];
    expect(bridgeControllerOptions.fetchFn).toBe(mockFetch);
  });

  it('controller state should be default state when no initial state is passed in', () => {
    bridgeControllerInit(initRequestMock);
    const bridgeControllerOptions = bridgeControllerClassMock.mock.calls[0][0];
    expect(bridgeControllerOptions.state).toEqual(defaultBridgeControllerState);
  });

  it('controller state should be set to initial state when initial state is passed in', () => {
    // Create a simple custom state that matches the structure
    const customState = { ...defaultBridgeControllerState };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      BridgeController: customState,
    };

    bridgeControllerInit(initRequestMock);
    const bridgeControllerOptions = bridgeControllerClassMock.mock.calls[0][0];
    expect(bridgeControllerOptions.state).toEqual(customState);
  });

  it('controller is initialized with the provided messenger', () => {
    bridgeControllerInit(initRequestMock);
    const bridgeControllerOptions = bridgeControllerClassMock.mock.calls[0][0];
    expect(bridgeControllerOptions.messenger).toBe(
      initRequestMock.controllerMessenger,
    );
  });

  it('gets TransactionController using getController', () => {
    bridgeControllerInit(initRequestMock);
    expect(initRequestMock.getController).toHaveBeenCalledWith(
      'TransactionController',
    );
  });

  it('sets up getLayer1GasFee correctly', async () => {
    bridgeControllerInit(initRequestMock);

    const bridgeControllerOptions = bridgeControllerClassMock.mock.calls[0][0];

    // Extract the getLayer1GasFee function from the options
    const getLayer1GasFeeFunc = bridgeControllerOptions.getLayer1GasFee;

    // Set up mock return value
    const mockReturnValue = { gasPrice: '0x1' };
    mockGetLayer1GasFee.mockResolvedValueOnce(mockReturnValue);

    // Test params with required 'from' property
    const testParams: TransactionParams = {
      to: '0x123',
      from: '0x456',
    };
    const testChainId = '0x1' as ChainId;

    // Call the function
    const result = await getLayer1GasFeeFunc({
      transactionParams: testParams,
      chainId: testChainId,
    });

    // Verify mockGetLayer1GasFee was called with correct params
    expect(mockGetLayer1GasFee).toHaveBeenCalledWith({
      transactionParams: testParams,
      chainId: testChainId,
    });

    // Verify the result is what mockGetLayer1GasFee returned
    expect(result).toBe(mockReturnValue);
  });
});
