import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getStorageServiceMessenger } from '../messengers/storage-service-messenger';
import { ControllerInitRequest } from '../types';
import { storageServiceInit } from './storage-service-init';
import {
  StorageService,
  StorageServiceMessenger,
} from '@metamask-previews/storage-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask-previews/storage-service');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<StorageServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getStorageServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('storageServiceInit', () => {
  it('initializes the service', () => {
    const { controller } = storageServiceInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(StorageService);
  });

  it('passes the proper arguments to the service', () => {
    storageServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(StorageService);

    expect(serviceMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      storage: expect.objectContaining({
        getItem: expect.any(Function),
        setItem: expect.any(Function),
        removeItem: expect.any(Function),
      }),
    });
  });

  it('provides FilesystemStorage adapter with required methods', () => {
    storageServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(StorageService);
    const callArguments = serviceMock.mock.calls[0][0];

    expect(callArguments.storage).toBeDefined();
    expect(callArguments.storage?.getItem).toBeInstanceOf(Function);
    expect(callArguments.storage?.setItem).toBeInstanceOf(Function);
    expect(callArguments.storage?.removeItem).toBeInstanceOf(Function);
    // getAllKeys and clear are optional
  });
});
