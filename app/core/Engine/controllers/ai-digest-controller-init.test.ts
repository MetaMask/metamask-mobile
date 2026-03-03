import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getAiDigestControllerMessenger } from '../messengers/ai-digest-controller-messenger';
import { ControllerInitRequest } from '../types';
import { aiDigestControllerInit } from './ai-digest-controller-init';
import {
  AiDigestController,
  AiDigestService,
  type AiDigestControllerMessenger,
} from '@metamask/ai-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import AppConstants from '../../AppConstants';

jest.mock('@metamask/ai-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<AiDigestControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getAiDigestControllerMessenger(baseMessenger),
  };
}

describe('aiDigestControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = aiDigestControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(AiDigestController);
  });

  it('passes the correct baseUrl (DIGEST_API_URL) to AiDigestService', () => {
    aiDigestControllerInit(getInitRequestMock());

    expect(jest.mocked(AiDigestService)).toHaveBeenCalledWith({
      baseUrl: AppConstants.DIGEST_API_URL,
    });
  });

  it('passes the service and messenger to AiDigestController', () => {
    aiDigestControllerInit(getInitRequestMock());

    expect(jest.mocked(AiDigestController)).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      digestService: expect.any(AiDigestService),
    });
  });
});
