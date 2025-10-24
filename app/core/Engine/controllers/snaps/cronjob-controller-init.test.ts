import { CronjobController } from '@metamask/snaps-controllers';
import { ControllerInitRequest } from '../../types';
import {
  CronjobControllerMessenger,
  getCronjobControllerMessenger,
} from '../../messengers/snaps';
import { cronjobControllerInit } from './cronjob-controller-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import ReduxService from '../../../redux';
import configureStore from '../../../../util/test/configureStore';

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<CronjobControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
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
