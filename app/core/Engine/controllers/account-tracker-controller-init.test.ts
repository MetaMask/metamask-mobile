import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getAccountTrackerControllerMessenger } from '../messengers/account-tracker-controller-messenger';

import { MessengerClientInitRequest } from '../types';
import { accountTrackerControllerInit } from './account-tracker-controller-init';
import {
  AccountTrackerController,
  AccountTrackerControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { selectAssetsAccountApiBalancesEnabled } from '../../../selectors/featureFlagController/assetsAccountApiBalances';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';

jest.mock('@metamask/assets-controllers');

jest.mock(
  '../../../selectors/featureFlagController/assetsAccountApiBalances',
  () => ({
    selectAssetsAccountApiBalancesEnabled: jest.fn().mockReturnValue([]),
  }),
);

jest.mock('../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn().mockReturnValue(true),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<AccountTrackerControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getAccountTrackerControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial mock.
  requestMock.getMessengerClient.mockImplementation((name: string) => {
    if (name === 'AssetsContractController') {
      return {
        getStakedBalanceForChain: jest.fn(),
      };
    }

    throw new Error(`Unexpected messenger client: ${name}`);
  });

  return requestMock;
}

describe('accountTrackerControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the proper arguments to the controller including isHomepageSectionsV1Enabled', () => {
    accountTrackerControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AccountTrackerController);
    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        includeStakedAssets: true,
        getStakedBalanceForChain: expect.any(Function),
        accountsApiChainIds: expect.any(Function),
        allowExternalServices: expect.any(Function),
        isHomepageSectionsV1Enabled: expect.any(Function),
      }),
    );
  });

  describe('isHomepageSectionsV1Enabled', () => {
    it('always returns true now that homepage sections UI is permanent', () => {
      accountTrackerControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(AccountTrackerController);
      const { isHomepageSectionsV1Enabled } = controllerMock.mock
        .calls[0][0] as {
        isHomepageSectionsV1Enabled: () => boolean;
      };

      expect(isHomepageSectionsV1Enabled()).toBe(true);
    });
  });

  it('reads account-api chain IDs from state', () => {
    accountTrackerControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AccountTrackerController);
    const { accountsApiChainIds } = controllerMock.mock.calls[0][0] as {
      accountsApiChainIds: () => `0x${string}`[];
    };

    jest.mocked(selectAssetsAccountApiBalancesEnabled).mockReturnValue(['0x1']);

    expect(accountsApiChainIds()).toEqual(['0x1']);
    expect(selectAssetsAccountApiBalancesEnabled).toHaveBeenCalled();
  });

  it('reads external services availability from settings state', () => {
    accountTrackerControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AccountTrackerController);
    const { allowExternalServices } = controllerMock.mock.calls[0][0] as {
      allowExternalServices: () => boolean;
    };

    jest.mocked(selectBasicFunctionalityEnabled).mockReturnValue(false);

    expect(allowExternalServices()).toBe(false);
    expect(selectBasicFunctionalityEnabled).toHaveBeenCalled();
  });
});
