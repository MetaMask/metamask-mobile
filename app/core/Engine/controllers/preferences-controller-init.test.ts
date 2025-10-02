import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getPreferencesControllerMessenger,
  type PreferencesControllerMessenger,
} from '../messengers/preferences-controller-messenger';
import { ControllerInitRequest } from '../types';
import { preferencesControllerInit } from './preferences-controller-init';
import { PreferencesController } from '@metamask/preferences-controller';

jest.mock('@metamask/preferences-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<PreferencesControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getPreferencesControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('PreferencesControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = preferencesControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(PreferencesController);
  });

  it('passes the proper arguments to the controller', () => {
    preferencesControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(PreferencesController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {
        displayNftMedia: true,
        ipfsGateway: 'https://dweb.link/ipfs/',
        securityAlertsEnabled: true,
        smartTransactionsOptInStatus: true,
        tokenSortConfig: {
          key: 'tokenFiatAmount',
          order: 'dsc',
          sortCallback: 'stringNumeric',
        },
        useNftDetection: true,
        useTokenDetection: true,
      },
    });
  });
});
