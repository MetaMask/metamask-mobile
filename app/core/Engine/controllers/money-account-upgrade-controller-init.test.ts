import { MoneyAccountUpgradeController } from '@metamask/money-account-upgrade-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getMoneyAccountUpgradeControllerMessenger } from '../messengers/money-account-upgrade-controller-messenger';
import Engine from '../../Engine';
import ReduxService from '../../redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';
import { moneyAccountUpgradeControllerInit } from './money-account-upgrade-controller-init';

jest.mock('@metamask/money-account-upgrade-controller');
jest.mock('../../redux');
jest.mock('../../Engine', () => ({
  __esModule: true,
  default: { context: { NetworkController: { addNetwork: jest.fn() } } },
}));
jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));
jest.mock('../../../lib/Money/feature-flags', () => ({
  isMoneyAccountEnabled: jest.fn(),
}));
jest.mock('../../../util/Logger', () => ({ error: jest.fn() }));

describe('moneyAccountUpgradeControllerInit', () => {
  it('constructs with v5 hooks and does not initialize', () => {
    const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>(
      { namespace: MOCK_ANY_NAMESPACE },
    );
    const controllerMessenger =
      getMoneyAccountUpgradeControllerMessenger(baseMessenger);
    const controller = { init: jest.fn() };
    jest
      .mocked(MoneyAccountUpgradeController)
      .mockImplementation(() => controller as never);
    jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);
    jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({});
    (ReduxService as unknown as { store: { getState: jest.Mock } }).store = {
      getState: jest.fn(),
    };

    const request = {
      ...buildMessengerClientInitRequestMock(baseMessenger),
      controllerMessenger,
      persistedState: {
        MoneyAccountUpgradeController: { upgradedAccounts: {} },
      },
    };
    const result = moneyAccountUpgradeControllerInit(request);

    expect(result.controller).toBe(controller);
    expect(MoneyAccountUpgradeController).toHaveBeenCalledWith(
      expect.objectContaining({
        hooks: expect.objectContaining({
          isEnabled: isMoneyAccountEnabled,
          ensureChainConfigured: expect.any(Function),
          onBootstrapError: expect.any(Function),
        }),
      }),
    );
    expect(controller.init).not.toHaveBeenCalled();
  });
});
