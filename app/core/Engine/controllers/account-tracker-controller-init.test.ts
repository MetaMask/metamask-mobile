import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getAccountTrackerControllerMessenger } from '../messengers/account-tracker-controller-messenger';

import { ControllerInitRequest } from '../types';
import { accountTrackerControllerInit } from './account-tracker-controller-init';
import {
  AccountTrackerController,
  AccountTrackerControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<AccountTrackerControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getAccountTrackerControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial mock.
  requestMock.getController.mockImplementation((name: string) => {
    if (name === 'AssetsContractController') {
      return {
        getStakedBalanceForChain: jest.fn(),
      };
    }

    throw new Error(`Controller "${name}" not found.`);
  });

  return requestMock;
}

describe('AccountTrackerControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = accountTrackerControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(AccountTrackerController);
  });

  it('passes the proper arguments to the controller', () => {
    accountTrackerControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AccountTrackerController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: { accountsByChainId: {} },
      includeStakedAssets: true,
      getStakedBalanceForChain: expect.any(Function),
      accountsApiChainIds: expect.any(Function),
      allowExternalServices: expect.any(Function),
      isOnboarded: expect.any(Function),
    });
  });
});
