import type { Hex } from '@metamask/utils';
import {
  MoneyAccountUpgradeController,
  type MoneyAccountUpgradeControllerHooks,
} from '@metamask/money-account-upgrade-controller';
import type { MoneyAccountVaultConfig } from '@metamask/money-account-utils';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import {
  getMoneyAccountUpgradeControllerInitMessenger,
  getMoneyAccountUpgradeControllerMessenger,
} from '../messengers/money-account-upgrade-controller-messenger';
import Engine from '../../Engine';
import { moneyAccountUpgradeControllerInit } from './money-account-upgrade-controller-init';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';
import Logger from '../../../util/Logger';

jest.mock('@metamask/money-account-upgrade-controller');

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

jest.mock('../../../lib/Money/feature-flags', () => ({
  isMoneyAccountEnabled: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const VAULT_CHAIN_ID = '0x8f' as Hex;

const VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: VAULT_CHAIN_ID,
  boringVault: '0x000000000000000000000000000000000000beef',
  tellerAddress: '0x0000000000000000000000000000000000000001',
  accountantAddress: '0x0000000000000000000000000000000000000002',
  lensAddress: '0x0000000000000000000000000000000000000003',
};

function getInitRequestMock({
  configuredChainIds = [],
}: { configuredChainIds?: Hex[] } = {}) {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on the mock messenger namespace.
    'NetworkController:getState',
    jest.fn().mockReturnValue({
      networkConfigurationsByChainId: Object.fromEntries(
        configuredChainIds.map((chainId) => [chainId, { chainId }]),
      ),
    }),
  );

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger:
      getMoneyAccountUpgradeControllerMessenger(baseMessenger),
    initMessenger: getMoneyAccountUpgradeControllerInitMessenger(baseMessenger),
  };
}

const getHooks = (): MoneyAccountUpgradeControllerHooks =>
  jest.mocked(MoneyAccountUpgradeController).mock.calls[0][0].hooks;

describe('moneyAccountUpgradeControllerInit', () => {
  const mockedController = {
    init: jest.fn(),
  } as unknown as jest.Mocked<MoneyAccountUpgradeController>;
  const mockAddNetwork = Engine.context.NetworkController
    .addNetwork as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(MoneyAccountUpgradeController)
      .mockImplementation(() => mockedController);
  });

  it('returns a MoneyAccountUpgradeController instance', () => {
    const { controller } =
      moneyAccountUpgradeControllerInit(getInitRequestMock());

    expect(controller).toBe(mockedController);
  });

  it('constructs the controller with its persisted state', () => {
    const requestMock = getInitRequestMock();
    const persistedControllerState = {
      upgradedAccounts: {
        '0x1111111111111111111111111111111111111111': {
          configFingerprint: 'fingerprint',
          completedAt: 1752451200000,
        },
      },
    };
    requestMock.persistedState = {
      MoneyAccountUpgradeController: persistedControllerState,
    };

    moneyAccountUpgradeControllerInit(requestMock);

    expect(jest.mocked(MoneyAccountUpgradeController)).toHaveBeenCalledWith(
      expect.objectContaining({ state: persistedControllerState }),
    );
  });

  it('leaves init() to Engine so the bootstrap runs after every controller is constructed', () => {
    moneyAccountUpgradeControllerInit(getInitRequestMock());

    expect(mockedController.init).not.toHaveBeenCalled();
  });

  describe('isEnabled hook', () => {
    it('gates on the moneyEnableMoneyAccount flag', () => {
      moneyAccountUpgradeControllerInit(getInitRequestMock());
      const flags = { moneyEnableMoneyAccount: { enabled: true } };
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);

      expect(getHooks().isEnabled(flags)).toBe(true);
      expect(isMoneyAccountEnabled).toHaveBeenCalledWith(flags);

      jest.mocked(isMoneyAccountEnabled).mockReturnValue(false);
      expect(getHooks().isEnabled(flags)).toBe(false);
    });
  });

  describe('ensureChainConfigured hook', () => {
    it('does not add the chain if it is already configured', async () => {
      moneyAccountUpgradeControllerInit(
        getInitRequestMock({ configuredChainIds: [VAULT_CHAIN_ID] }),
      );

      await getHooks().ensureChainConfigured?.(VAULT_CONFIG);

      expect(mockAddNetwork).not.toHaveBeenCalled();
    });

    it('adds the chain from PopularList when it is not configured', async () => {
      moneyAccountUpgradeControllerInit(getInitRequestMock());

      await getHooks().ensureChainConfigured?.(VAULT_CONFIG);

      expect(mockAddNetwork).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: VAULT_CHAIN_ID,
          name: 'Monad',
        }),
      );
    });

    it('throws when the missing chain is not in PopularList', async () => {
      const UNSUPPORTED_CHAIN_ID = '0xdeadbeef' as Hex;
      moneyAccountUpgradeControllerInit(getInitRequestMock());

      await expect(
        getHooks().ensureChainConfigured?.({
          ...VAULT_CONFIG,
          chainId: UNSUPPORTED_CHAIN_ID,
        }),
      ).rejects.toThrow(UNSUPPORTED_CHAIN_ID);
      expect(mockAddNetwork).not.toHaveBeenCalled();
    });
  });

  describe('onBootstrapError hook', () => {
    it('reports bootstrap failures to Sentry under the money-account-upgrade tag', () => {
      moneyAccountUpgradeControllerInit(getInitRequestMock());
      const error = new Error('Missing Money Account vault config');

      getHooks().onBootstrapError?.(error);

      expect(Logger.error).toHaveBeenCalledWith(error, {
        tags: { feature: 'money-account-upgrade' },
        context: {
          name: 'money_account_upgrade',
          data: { phase: 'bootstrap', failure: 1 },
        },
      });
    });

    // The controller re-runs a failed bootstrap on every keyring and
    // feature-flag state change, so an uncapped hook emits a Sentry event per
    // keyring mutation for the whole session during an outage.
    it('stops reporting after the per-session cap', () => {
      moneyAccountUpgradeControllerInit(getInitRequestMock());
      const { onBootstrapError } = getHooks();

      for (let i = 0; i < 5; i++) {
        onBootstrapError?.(new Error('chomp is down'));
      }

      expect(Logger.error).toHaveBeenCalledTimes(3);
      expect(Logger.error).toHaveBeenLastCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              failure: 3,
              furtherReportsSuppressed: true,
            }),
          }),
        }),
      );
      // Suppressed failures are still logged locally.
      expect(Logger.log).toHaveBeenCalledTimes(2);
    });

    it('wraps non-Error failures before reporting them', () => {
      moneyAccountUpgradeControllerInit(getInitRequestMock());

      getHooks().onBootstrapError?.('boom');

      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'boom' }),
        expect.objectContaining({
          tags: { feature: 'money-account-upgrade' },
        }),
      );
    });
  });
});
