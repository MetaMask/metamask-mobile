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

jest.mock('../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageSectionsV1Enabled: jest.fn().mockReturnValue(false),
}));

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

  it('passes the proper arguments to the controller including isHomepageSectionsV1Enabled', () => {
    accountTrackerControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AccountTrackerController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: { accountsByChainId: {} },
      includeStakedAssets: true,
      getStakedBalanceForChain: expect.any(Function),
      accountsApiChainIds: expect.any(Function),
      allowExternalServices: expect.any(Function),
      isHomepageSectionsV1Enabled: expect.any(Function),
    });
  });

  it('isHomepageSectionsV1Enabled returns false when feature flag is off', () => {
    const { selectHomepageSectionsV1Enabled } = jest.requireMock(
      '../../../selectors/featureFlagController/homepage',
    );
    selectHomepageSectionsV1Enabled.mockReturnValue(false);

    accountTrackerControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AccountTrackerController);
    const { isHomepageSectionsV1Enabled } = controllerMock.mock.calls[0][0] as {
      isHomepageSectionsV1Enabled: () => boolean;
    };

    expect(isHomepageSectionsV1Enabled()).toBe(false);
  });

  it('isHomepageSectionsV1Enabled returns true when feature flag is on', () => {
    const { selectHomepageSectionsV1Enabled } = jest.requireMock(
      '../../../selectors/featureFlagController/homepage',
    );
    selectHomepageSectionsV1Enabled.mockReturnValue(true);

    accountTrackerControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AccountTrackerController);
    const { isHomepageSectionsV1Enabled } = controllerMock.mock.calls[0][0] as {
      isHomepageSectionsV1Enabled: () => boolean;
    };

    expect(isHomepageSectionsV1Enabled()).toBe(true);
  });
});
