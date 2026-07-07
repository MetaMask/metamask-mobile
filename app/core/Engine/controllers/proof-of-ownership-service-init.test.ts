import {
  ProofOfOwnershipService,
  ProofOfOwnershipServiceMessenger,
} from '@metamask/profile-metrics-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProofOfOwnershipServiceMessenger } from '../messengers/proof-of-ownership-service-messenger';
import { proofOfOwnershipServiceInit } from './proof-of-ownership-service-init';

jest.mock('@metamask/profile-metrics-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<ProofOfOwnershipServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getProofOfOwnershipServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('proofOfOwnershipServiceInit', () => {
  it('initializes the service', () => {
    const { controller } = proofOfOwnershipServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ProofOfOwnershipService);
  });

  it('passes the proper arguments to the controller', () => {
    proofOfOwnershipServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(ProofOfOwnershipService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
    });
  });
});
