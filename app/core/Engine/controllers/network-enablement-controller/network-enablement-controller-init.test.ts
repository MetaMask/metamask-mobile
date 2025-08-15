import {
  NetworkEnablementController,
  NetworkEnablementControllerMessenger,
  NetworkEnablementControllerState,
} from '@metamask/network-enablement-controller';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { networkEnablementControllerInit } from './network-enablement-controller-init';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { KnownCaipNamespace } from '@metamask/utils';
import { ChainId } from '@metamask/controller-utils';
import { SolScope } from '@metamask/keyring-api';

jest.mock('@metamask/network-enablement-controller');

describe('networkEnablementControllerInit', () => {
  const networkEnablementControllerClassMock = jest.mocked(
    NetworkEnablementController,
  );
  let initRequestMock: ControllerInitRequest<NetworkEnablementControllerMessenger>;

  beforeEach(() => {
    jest.resetAllMocks();

    const baseControllerMessenger = new ExtendedControllerMessenger();
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    const result = networkEnablementControllerInit(initRequestMock);

    expect(result.controller).toBeInstanceOf(NetworkEnablementController);
  });

  it('initializes controller with messenger from request', () => {
    networkEnablementControllerInit(initRequestMock);

    const constructorCall =
      networkEnablementControllerClassMock.mock.calls[0][0];
    expect(constructorCall.messenger).toBe(initRequestMock.controllerMessenger);
  });

  it('uses default state when no initial state is provided', () => {
    networkEnablementControllerInit(initRequestMock);

    const constructorCall =
      networkEnablementControllerClassMock.mock.calls[0][0];
    expect(constructorCall.state).toBeUndefined();
  });

  it('uses persisted state when initial state is provided', () => {
    const initialNetworkEnablementState: NetworkEnablementControllerState = {
      enabledNetworkMap: {
        [KnownCaipNamespace.Eip155]: {
          [ChainId.mainnet]: true,
          [ChainId.sepolia]: false,
        },
        [KnownCaipNamespace.Solana]: {
          [SolScope.Mainnet]: true,
        },
      },
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      NetworkEnablementController: initialNetworkEnablementState,
    };

    networkEnablementControllerInit(initRequestMock);

    const constructorCall =
      networkEnablementControllerClassMock.mock.calls[0][0];
    expect(constructorCall.state).toEqual(initialNetworkEnablementState);
  });

  it('passes state as undefined when persisted state is not NetworkEnablementControllerState type', () => {
    const invalidState = { invalidProperty: 'invalid' };
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      NetworkEnablementController:
        invalidState as unknown as NetworkEnablementControllerState,
    };

    networkEnablementControllerInit(initRequestMock);

    const constructorCall =
      networkEnablementControllerClassMock.mock.calls[0][0];
    expect(constructorCall.state).toEqual(invalidState);
  });
});
