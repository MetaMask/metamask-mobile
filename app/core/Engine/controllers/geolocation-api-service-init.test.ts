import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getGeolocationApiServiceMessenger } from '../messengers/geolocation-api-service-messenger';
import type { ControllerInitRequest } from '../types';
import { geolocationApiServiceInit } from './geolocation-api-service-init';
import {
  GeolocationApiService,
  Env,
  type GeolocationApiServiceMessenger,
} from '@metamask/geolocation-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/geolocation-controller');

jest.mock('../../../components/UI/Ramp/Deposit/sdk/getSdkEnvironment', () => ({
  getSdkEnvironment: jest.fn(),
}));

import { getSdkEnvironment } from '../../../components/UI/Ramp/Deposit/sdk/getSdkEnvironment';
import { SdkEnvironment } from '@consensys/native-ramps-sdk';
const mockGetSdkEnvironment = jest.mocked(getSdkEnvironment);

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<GeolocationApiServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getGeolocationApiServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('geolocationApiServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);
  });

  it('initializes the service', () => {
    const { controller } = geolocationApiServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(GeolocationApiService);
  });

  it('passes Env.PRD for production environment', () => {
    mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);
    geolocationApiServiceInit(getInitRequestMock());

    const ServiceMock = jest.mocked(GeolocationApiService);
    expect(ServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ env: Env.PRD }),
    );
  });

  it('passes Env.DEV for staging environment', () => {
    mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Staging);
    geolocationApiServiceInit(getInitRequestMock());

    const ServiceMock = jest.mocked(GeolocationApiService);
    expect(ServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ env: Env.DEV }),
    );
  });

  it('passes fetch and messenger to the service', () => {
    geolocationApiServiceInit(getInitRequestMock());

    const ServiceMock = jest.mocked(GeolocationApiService);
    expect(ServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
        fetch: expect.any(Function),
      }),
    );
  });
});
