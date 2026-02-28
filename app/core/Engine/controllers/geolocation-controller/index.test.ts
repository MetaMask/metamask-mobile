import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getGeolocationControllerMessenger } from '../../messengers/geolocation-controller-messenger';
import type { ControllerInitRequest } from '../../types';
import { geolocationControllerInit } from './index';
import {
  GeolocationController,
  type GeolocationControllerMessenger,
} from '@metamask/geolocation-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/geolocation-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<GeolocationControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getGeolocationControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('geolocationControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } = geolocationControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(GeolocationController);
  });

  it('passes the messenger to the controller', () => {
    geolocationControllerInit(getInitRequestMock());

    const ControllerMock = jest.mocked(GeolocationController);
    expect(ControllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
      }),
    );
  });

  it('triggers getGeolocation on init for eager fetch', () => {
    const { controller } = geolocationControllerInit(getInitRequestMock());
    expect(controller.getGeolocation).toHaveBeenCalled();
  });
});
