import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getSnapKeyringBuilderInitMessenger,
  getSnapKeyringBuilderMessenger,
  SnapKeyringBuilderInitMessenger,
} from '../messengers/snap-keyring-builder-messenger';
import { ControllerInitRequest } from '../types';
import { snapKeyringBuilderInit } from './snap-keyring-builder-init';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { SnapKeyringBuilderMessenger } from '../../SnapKeyring/types';

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    SnapKeyringBuilderMessenger,
    SnapKeyringBuilderInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSnapKeyringBuilderMessenger(baseMessenger),
    initMessenger: getSnapKeyringBuilderInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('snapKeyringBuilderInit', () => {
  it('initializes the controller', () => {
    const { controller } = snapKeyringBuilderInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(Function);
  });
});
