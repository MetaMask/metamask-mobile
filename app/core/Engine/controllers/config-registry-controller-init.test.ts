import { MessengerClientInitRequest } from '../types';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import {
  ConfigRegistryController,
  ConfigRegistryControllerMessenger,
} from '@metamask/config-registry-controller';
import { ConfigRegistryControllerInit } from './config-registry-controller-init';

jest.mock('@metamask/config-registry-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<ConfigRegistryControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return buildMessengerClientInitRequestMock(baseMessenger);
}

describe('configRegistryControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } = ConfigRegistryControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ConfigRegistryController);
  });

  it('passes the proper arguments to the controller', () => {
    ConfigRegistryControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(ConfigRegistryController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });
});
