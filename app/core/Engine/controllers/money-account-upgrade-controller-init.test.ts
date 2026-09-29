import type { Hex } from '@metamask/utils';
import { MoneyAccountUpgradeController } from '@metamask/money-account-upgrade-controller';
import type { MoneyAccountVaultConfig } from '@metamask/money-account-utils';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getMoneyAccountUpgradeControllerMessenger } from '../messengers/money-account-upgrade-controller-messenger';
import Engine from '../../Engine';
import ReduxService from '../../redux';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { moneyAccountUpgradeControllerInit } from './money-account-upgrade-controller-init';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';
import Logger from '../../../util/Logger';

jest.mock('@metamask/money-account-upgrade-controller');

jest.mock('../../redux');

jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        addNetwork: jest.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../lib/Money/feature-flags', () => ({
  isMoneyAccountEnabled: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const VAULT_CHAIN_ID = '0x8f' as Hex;

const VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: VAULT_CHAIN_ID,
  boringVault: '0x000000000000000000000000000000000000beef',
  tellerAddress: '0x0000000000000000000000000000000000000001',
  accountantAddress: '0x0000000000000000000000000000000000000002',
  lensAddress: '0x0000000000000000000000000000000000000003',
};

function getInitRequestMock() {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return buildMessengerClientInitRequestMock(
    getMoneyAccountUpgradeControllerMessenger(
      baseMessenger,
    ) as unknown as Parameters<typeof buildMessengerClientInitRequestMock>[0],
  );
}

describe('moneyAccountUpgradeControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ReduxService as unknown as { store: { getState: jest.Mock } }).store = {
      getState: jest.fn().mockReturnValue({}),
    };
    jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({});
  });

  it('constructs the controller with hooks and persisted state', () => {
    const initRequest = getInitRequestMock();

    const { controller } = moneyAccountUpgradeControllerInit(initRequest);

    expect(MoneyAccountUpgradeController).toHaveBeenCalledWith({
      messenger: initRequest.controllerMessenger,
      state: initRequest.persistedState.MoneyAccountUpgradeController,
      hooks: {
        isEnabled: isMoneyAccountEnabled,
        ensureChainConfigured: expect.any(Function),
        onBootstrapError: expect.any(Function),
      },
    });
    expect(controller).toBeInstanceOf(MoneyAccountUpgradeController);
  });

  it('ensureChainConfigured adds the vault chain when missing', async () => {
    const initRequest = getInitRequestMock();
    moneyAccountUpgradeControllerInit(initRequest);

    const hooks = jest.mocked(MoneyAccountUpgradeController).mock.calls[0][0]
      .hooks;
    await hooks.ensureChainConfigured?.(VAULT_CONFIG);

    expect(Engine.context.NetworkController.addNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: VAULT_CHAIN_ID }),
    );
  });

  it('ensureChainConfigured is a no-op when the chain already exists', async () => {
    jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({
      [VAULT_CHAIN_ID]: {},
    } as ReturnType<typeof selectEvmNetworkConfigurationsByChainId>);

    const initRequest = getInitRequestMock();
    moneyAccountUpgradeControllerInit(initRequest);

    const hooks = jest.mocked(MoneyAccountUpgradeController).mock.calls[0][0]
      .hooks;
    await hooks.ensureChainConfigured?.(VAULT_CONFIG);

    expect(Engine.context.NetworkController.addNetwork).not.toHaveBeenCalled();
  });

  it('onBootstrapError reports failures to Logger', () => {
    const initRequest = getInitRequestMock();
    moneyAccountUpgradeControllerInit(initRequest);

    const hooks = jest.mocked(MoneyAccountUpgradeController).mock.calls[0][0]
      .hooks;
    const error = new Error('bootstrap failed');
    hooks.onBootstrapError?.(error);

    expect(Logger.error).toHaveBeenCalledWith(error, {
      tags: { feature: 'money-account-upgrade' },
      context: {
        name: 'money_account_upgrade',
        data: { phase: 'bootstrap' },
      },
    });
  });
});
