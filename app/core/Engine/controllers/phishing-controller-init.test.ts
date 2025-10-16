import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getPhishingControllerMessenger,
  type PhishingControllerMessenger,
} from '../messengers/phishing-controller-messenger';
import { ControllerInitRequest } from '../types';
import { phishingControllerInit } from './phishing-controller-init';
import { PhishingController } from '@metamask/phishing-controller';

jest.mock('@metamask/phishing-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<PhishingControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getPhishingControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial mock.
  requestMock.getState.mockImplementation(() => ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {},
        },
      },
    },
  }));

  return requestMock;
}

describe('PhishingControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = phishingControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(PhishingController);
  });

  it('passes the proper arguments to the controller', () => {
    phishingControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(PhishingController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
    });
  });
});
