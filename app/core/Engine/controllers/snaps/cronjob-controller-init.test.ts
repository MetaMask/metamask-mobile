import { CronjobController } from '@metamask/snaps-controllers';
import { MessengerClientInitRequest } from '../../types';
import {
  CronjobControllerMessenger,
  getCronjobControllerMessenger,
} from '../../messengers/snaps';
import { cronjobControllerInit } from './cronjob-controller-init';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import ReduxService from '../../../redux';
import configureStore from '../../../../util/test/configureStore';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<CronjobControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getCronjobControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('CronjobControllerInit', () => {
  beforeEach(() => {
    ReduxService.store = configureStore({});
  });

  it('initializes the controller', () => {
    const { controller } = cronjobControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(CronjobController);
  });
});
