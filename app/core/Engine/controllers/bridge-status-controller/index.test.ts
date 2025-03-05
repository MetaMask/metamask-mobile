import {
  BridgeStatusController,
  type BridgeStatusControllerMessenger,
} from '@metamask/bridge-status-controller';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { bridgeStatusControllerInit } from '.';
import { BridgeClientId } from '@metamask/bridge-controller';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { defaultBridgeStatusControllerState } from './constants';

jest.mock('@metamask/bridge-status-controller');

describe('bridge status controller init', () => {
  const bridgeStatusControllerClassMock = jest.mocked(BridgeStatusController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<BridgeStatusControllerMessenger>
  >;

  // Define a mock fetch function
  const mockFetch = jest.fn();

  // Store the global fetch function
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();

    // Replace global fetch with mock
    global.fetch = mockFetch;

    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  afterEach(() => {
    // Restore global fetch
    global.fetch = originalFetch;
  });

  it('returns controller instance', () => {
    expect(
      bridgeStatusControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(BridgeStatusController);
  });

  it('controller is initialized with the correct clientId', () => {
    bridgeStatusControllerInit(initRequestMock);
    const bridgeStatusControllerOptions =
      bridgeStatusControllerClassMock.mock.calls[0][0];
    expect(bridgeStatusControllerOptions.clientId).toBe(BridgeClientId.MOBILE);
  });

  it('controller is initialized with the fetch function', () => {
    bridgeStatusControllerInit(initRequestMock);
    const bridgeStatusControllerOptions =
      bridgeStatusControllerClassMock.mock.calls[0][0];
    expect(bridgeStatusControllerOptions.fetchFn).toBe(mockFetch);
  });

  it('controller state should be default state when no initial state is passed in', () => {
    bridgeStatusControllerInit(initRequestMock);
    const bridgeStatusControllerOptions =
      bridgeStatusControllerClassMock.mock.calls[0][0];
    expect(bridgeStatusControllerOptions.state).toEqual(
      defaultBridgeStatusControllerState,
    );
  });

  it('controller state should be set to initial state when initial state is passed in', () => {
    // Create a simple custom state that matches the structure but with empty values
    const customState = { ...defaultBridgeStatusControllerState };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      BridgeStatusController: customState,
    };

    bridgeStatusControllerInit(initRequestMock);
    const bridgeStatusControllerOptions =
      bridgeStatusControllerClassMock.mock.calls[0][0];
    expect(bridgeStatusControllerOptions.state).toEqual(customState);
  });

  it('controller is initialized with the provided messenger', () => {
    bridgeStatusControllerInit(initRequestMock);
    const bridgeStatusControllerOptions =
      bridgeStatusControllerClassMock.mock.calls[0][0];
    expect(bridgeStatusControllerOptions.messenger).toBe(
      initRequestMock.controllerMessenger,
    );
  });
});
