import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getPhishingControllerMessenger } from '../messengers/phishing-controller-messenger';
import { ControllerInitRequest } from '../types';
import { phishingControllerInit } from './phishing-controller-init';
import {
  PhishingController,
  PhishingControllerMessenger,
} from '@metamask/phishing-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/phishing-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<PhishingControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
