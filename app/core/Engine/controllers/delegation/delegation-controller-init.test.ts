import {
  DelegationController,
  DelegationControllerMessenger,
} from '@metamask/delegation-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
} from '@metamask/messenger';
import { DelegationControllerInit } from './delegation-controller-init';
import { MessengerClientInitRequest } from '../../types';
import { getDelegationControllerMessenger } from '../../messengers/delegation/delegation-controller-messenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';

jest.mock('@metamask/delegation-controller');

function buildInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<DelegationControllerMessenger, void>
> {
  const baseControllerMessenger = new Messenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const controllerMessenger = getDelegationControllerMessenger(
    baseControllerMessenger,
  );
  const extendedControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(extendedControllerMessenger),
    controllerMessenger,
    persistedState: {
      DelegationController: {},
    },
  };
}

describe('DelegationControllerInit', () => {
  const DelegationControllerClassMock = jest.mocked(DelegationController);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(DelegationControllerInit(requestMock).controller).toBeInstanceOf(
      DelegationController,
    );
  });

  it('initializes with correct messenger, state, and environment resolver', () => {
    const requestMock = buildInitRequestMock();
    DelegationControllerInit(requestMock);

    expect(DelegationControllerClassMock).toHaveBeenCalledWith({
      messenger: requestMock.controllerMessenger,
      state: requestMock.persistedState.DelegationController,
      getDelegationEnvironment: expect.any(Function),
    });
  });

  it('returns only the controller', () => {
    const requestMock = buildInitRequestMock();
    const result = DelegationControllerInit(requestMock);

    expect(Object.keys(result)).toStrictEqual(['controller']);
  });
});
