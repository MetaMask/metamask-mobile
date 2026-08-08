import { SDK } from '@metamask/profile-sync-controller';
import {
  ConfigRegistryApiService,
  ConfigRegistryApiServiceMessenger,
} from '@metamask/config-registry-controller';
import { configRegistryApiServiceInit } from './config-registry-api-service-init';
import { MessengerClientInitRequest } from '../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getConfigRegistryApiServiceMessenger } from '../messengers/config-registry-api-service-messenger';

jest.mock('@metamask/config-registry-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<ConfigRegistryApiServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getConfigRegistryApiServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('ConfigRegistryApiServiceInit', () => {
  it('initializes the service', () => {
    const { controller } = configRegistryApiServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ConfigRegistryApiService);
  });

  it('passes the proper arguments to the controller', () => {
    configRegistryApiServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(ConfigRegistryApiService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      fetch: expect.any(Function),
      env: SDK.Env.PRD,
    });
  });
});
