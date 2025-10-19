import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getPPOMControllerInitMessenger,
  getPPOMControllerMessenger,
  PPOMControllerInitMessenger,
  type PPOMControllerMessenger,
} from '../messengers/ppom-controller-messenger';
import { ControllerInitRequest } from '../types';
import { ppomControllerInit } from './ppom-controller-init';
import { PPOMController } from '@metamask/ppom-validator';
import Crypto from 'react-native-quick-crypto';

jest.mock('@metamask/ppom-validator');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<PPOMControllerMessenger, PPOMControllerInitMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getPPOMControllerMessenger(baseMessenger),
    initMessenger: getPPOMControllerInitMessenger(baseMessenger),
  };

  // @ts-expect-error: Partial mock.
  requestMock.getController.mockImplementation((name) => {
    if (name === 'NetworkController') {
      return {
        state: {
          selectedNetworkClientId: 'mainnet',
        },

        getNetworkClientById: jest
          .fn()
          .mockImplementation((networkClientId) => {
            if (networkClientId === 'mainnet') {
              return {
                configuration: {
                  chainId: '0x1',
                },
              };
            }

            throw new Error(`Network client "${networkClientId}" not found.`);
          }),
      };
    }

    throw new Error(`Controller "${name}" not found.`);
  });

  // @ts-expect-error: Partial mock.
  baseMessenger.registerActionHandler('PreferencesController:getState', () => ({
    securityAlertsEnabled: true,
  }));

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Partial mock.
    'NetworkController:getSelectedNetworkClient',
    () => ({
      provider: {},
    }),
  );

  return requestMock;
}

describe('ppomControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = ppomControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(PPOMController);
  });

  it('passes the proper arguments to the controller', () => {
    ppomControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(PPOMController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      chainId: '0x1',
      blockaidPublicKey: process.env.BLOCKAID_PUBLIC_KEY,
      cdnBaseUrl: process.env.BLOCKAID_FILE_CDN,
      onPreferencesChange: expect.any(Function),
      provider: {},
      ppomProvider: {
        PPOM: expect.any(Object),
        ppomInit: expect.any(Function),
      },
      storageBackend: expect.any(Object),
      securityAlertsEnabled: true,
      nativeCrypto: Crypto,
    });
  });
});
