import type { Hex } from '@metamask/utils';
import { MoneyAccountUpgradeController } from '@metamask/money-account-upgrade-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import {
  getMoneyAccountUpgradeControllerInitMessenger,
  getMoneyAccountUpgradeControllerMessenger,
} from '../messengers/money-account-upgrade-controller-messenger';
import Engine from '../../Engine';
import ReduxService from '../../redux';
import type { MoneyAccountVaultConfig } from '../../../selectors/featureFlagController/moneyAccount';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import {
  __resetMoneyAccountUpgradeBootstrapForTesting,
  moneyAccountUpgradeControllerInit,
  whenMoneyAccountUpgradeReady,
} from './money-account-upgrade-controller-init';
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
const BORING_VAULT_ADDRESS =
  '0x000000000000000000000000000000000000beef' as Hex;

const VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: VAULT_CHAIN_ID,
  boringVault: BORING_VAULT_ADDRESS,
  tellerAddress: '0x0000000000000000000000000000000000000001',
  accountantAddress: '0x0000000000000000000000000000000000000002',
  lensAddress: '0x0000000000000000000000000000000000000003',
};

function getInitRequestMock({
  isUnlocked,
  remoteFeatureFlagsState,
}: {
  isUnlocked: boolean;
  remoteFeatureFlagsState?: {
    remoteFeatureFlags: Record<string, unknown>;
    localOverrides: Record<string, unknown>;
  };
}) {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on the mock messenger namespace.
    'KeyringController:getState',
    jest.fn().mockReturnValue({ isUnlocked }),
  );

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on the mock messenger namespace.
    'RemoteFeatureFlagController:getState',
    jest.fn().mockReturnValue(
      remoteFeatureFlagsState ?? {
        remoteFeatureFlags: {},
        localOverrides: {},
      },
    ),
  );

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger:
      getMoneyAccountUpgradeControllerMessenger(baseMessenger),
    initMessenger: getMoneyAccountUpgradeControllerInitMessenger(baseMessenger),
  };

  return { requestMock, baseMessenger };
}

const publishFlagOn = (
  baseMessenger: ExtendedMessenger<MockAnyNamespace, never, never>,
) =>
  baseMessenger.publish(
    // @ts-expect-error: Event not allowed on the mock messenger namespace.
    'RemoteFeatureFlagController:stateChange',
    {
      remoteFeatureFlags: { moneyAccountVaultConfig: VAULT_CONFIG },
      localOverrides: {},
    },
  );

const flushAsync = () => new Promise(process.nextTick);

describe('moneyAccountUpgradeControllerInit', () => {
  let mockedController: jest.Mocked<MoneyAccountUpgradeController>;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetMoneyAccountUpgradeBootstrapForTesting();

    mockedController = {
      init: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MoneyAccountUpgradeController>;
    jest
      .mocked(MoneyAccountUpgradeController)
      .mockImplementation(() => mockedController);

    (ReduxService as unknown as { store: { getState: jest.Mock } }).store = {
      getState: jest.fn().mockReturnValue({}),
    };
    jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({
      [VAULT_CHAIN_ID]: {
        chainId: VAULT_CHAIN_ID,
      } as never,
    });
    jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);
  });

  const mockAddNetwork = Engine.context.NetworkController
    .addNetwork as jest.Mock;

  it('returns a MoneyAccountUpgradeController instance', () => {
    const { requestMock } = getInitRequestMock({ isUnlocked: false });

    const { controller } = moneyAccountUpgradeControllerInit(requestMock);

    expect(controller).toBe(mockedController);
  });

  it('constructs the controller with its persisted state', () => {
    const { requestMock } = getInitRequestMock({ isUnlocked: false });
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

  describe('whenMoneyAccountUpgradeReady', () => {
    it('rejects when bootstrap has not been scheduled yet', async () => {
      await expect(whenMoneyAccountUpgradeReady()).rejects.toThrow(
        'MoneyAccountUpgradeController bootstrap has not been scheduled yet',
      );
    });

    it('resolves once bootstrap completes when keyring is already unlocked and the flag turns on', async () => {
      const { requestMock, baseMessenger } = getInitRequestMock({
        isUnlocked: true,
      });

      moneyAccountUpgradeControllerInit(requestMock);
      publishFlagOn(baseMessenger);

      await expect(whenMoneyAccountUpgradeReady()).resolves.toBeUndefined();
      expect(mockedController.init).toHaveBeenCalledTimes(1);
    });
  });

  it('initializes the controller with the chainId and boring vault address from the vault config when unlocked', async () => {
    const { requestMock, baseMessenger } = getInitRequestMock({
      isUnlocked: true,
    });

    moneyAccountUpgradeControllerInit(requestMock);
    publishFlagOn(baseMessenger);
    await flushAsync();

    expect(mockedController.init).toHaveBeenCalledWith({
      chainId: VAULT_CHAIN_ID,
      boringVaultAddress: BORING_VAULT_ADDRESS,
    });
  });

  it('defers bootstrap until KeyringController:unlock fires when keyring is locked', async () => {
    const { requestMock, baseMessenger } = getInitRequestMock({
      isUnlocked: false,
    });

    moneyAccountUpgradeControllerInit(requestMock);
    publishFlagOn(baseMessenger);
    await flushAsync();

    expect(mockedController.init).not.toHaveBeenCalled();

    // @ts-expect-error: Event not allowed on the mock messenger namespace.
    baseMessenger.publish('KeyringController:unlock');
    await flushAsync();

    expect(mockedController.init).toHaveBeenCalledTimes(1);
  });

  it('only bootstraps once even if KeyringController:unlock fires multiple times', async () => {
    const { requestMock, baseMessenger } = getInitRequestMock({
      isUnlocked: false,
    });

    moneyAccountUpgradeControllerInit(requestMock);
    publishFlagOn(baseMessenger);
    // @ts-expect-error: Event not allowed on the mock messenger namespace.
    baseMessenger.publish('KeyringController:unlock');
    // @ts-expect-error: Event not allowed on the mock messenger namespace.
    baseMessenger.publish('KeyringController:unlock');
    await flushAsync();

    expect(mockedController.init).toHaveBeenCalledTimes(1);
  });

  it('logs an error when the flag is on but the vault config is missing', async () => {
    const { requestMock, baseMessenger } = getInitRequestMock({
      isUnlocked: true,
    });

    moneyAccountUpgradeControllerInit(requestMock);
    // @ts-expect-error: Event not allowed on the mock messenger namespace.
    baseMessenger.publish('RemoteFeatureFlagController:stateChange', {
      remoteFeatureFlags: {},
      localOverrides: {},
    });
    await flushAsync();

    expect(mockedController.init).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Missing Money Account vault config',
      }),
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'money-account-upgrade' }),
      }),
    );
  });

  describe('feature flag gating', () => {
    it('does not bootstrap when the moneyEnableMoneyAccount flag is off', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(false);
      const { requestMock } = getInitRequestMock({ isUnlocked: true });

      moneyAccountUpgradeControllerInit(requestMock);
      await flushAsync();

      expect(mockedController.init).not.toHaveBeenCalled();
      await expect(whenMoneyAccountUpgradeReady()).rejects.toThrow(
        'MoneyAccountUpgradeController bootstrap has not been scheduled yet',
      );
    });

    it('bootstraps once the flag flips on via RemoteFeatureFlagController:stateChange', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(false);
      const { requestMock, baseMessenger } = getInitRequestMock({
        isUnlocked: true,
      });

      moneyAccountUpgradeControllerInit(requestMock);
      await flushAsync();

      expect(mockedController.init).not.toHaveBeenCalled();

      jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);
      publishFlagOn(baseMessenger);
      await flushAsync();

      expect(mockedController.init).toHaveBeenCalledTimes(1);
    });

    it('only bootstraps once even if the flag-on state change fires multiple times', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(false);
      const { requestMock, baseMessenger } = getInitRequestMock({
        isUnlocked: true,
      });

      moneyAccountUpgradeControllerInit(requestMock);

      jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);
      publishFlagOn(baseMessenger);
      publishFlagOn(baseMessenger);
      await flushAsync();

      expect(mockedController.init).toHaveBeenCalledTimes(1);
    });

    it('ignores state changes while the flag remains off', async () => {
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(false);
      const { requestMock, baseMessenger } = getInitRequestMock({
        isUnlocked: true,
      });

      moneyAccountUpgradeControllerInit(requestMock);
      // @ts-expect-error: Event not allowed on the mock messenger namespace.
      baseMessenger.publish('RemoteFeatureFlagController:stateChange', {
        remoteFeatureFlags: {},
        localOverrides: {},
      });
      await flushAsync();

      expect(mockedController.init).not.toHaveBeenCalled();
    });

    it('bootstraps from the cached RemoteFeatureFlagController state at init time, without waiting for a stateChange event', async () => {
      // Returning user: the cache is fresh, so `updateRemoteFeatureFlags`
      // early-returns and no stateChange ever fires. We must still init from
      // the persisted state restored into the controller at construction.
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);
      const { requestMock } = getInitRequestMock({
        isUnlocked: true,
        remoteFeatureFlagsState: {
          remoteFeatureFlags: { moneyAccountVaultConfig: VAULT_CONFIG },
          localOverrides: {},
        },
      });

      moneyAccountUpgradeControllerInit(requestMock);
      await flushAsync();

      expect(mockedController.init).toHaveBeenCalledWith({
        chainId: VAULT_CHAIN_ID,
        boringVaultAddress: BORING_VAULT_ADDRESS,
      });
    });

    it('initializes from the stateChange event payload, not from Redux', async () => {
      // The messenger publishes stateChange synchronously inside
      // BaseController.update(), but the Redux store is updated up to 250ms
      // later via EngineService.updateBatcher. Reading vaultConfig from
      // Redux at this point would see stale (often undefined) data, so we
      // must derive it from the event payload instead.
      (
        ReduxService as unknown as { store: { getState: jest.Mock } }
      ).store.getState.mockReturnValue({});
      jest.mocked(isMoneyAccountEnabled).mockReturnValue(true);
      const { requestMock, baseMessenger } = getInitRequestMock({
        isUnlocked: true,
      });

      moneyAccountUpgradeControllerInit(requestMock);
      // @ts-expect-error: Event not allowed on the mock messenger namespace.
      baseMessenger.publish('RemoteFeatureFlagController:stateChange', {
        remoteFeatureFlags: { moneyAccountVaultConfig: VAULT_CONFIG },
        localOverrides: {},
      });
      await flushAsync();

      expect(mockedController.init).toHaveBeenCalledWith({
        chainId: VAULT_CHAIN_ID,
        boringVaultAddress: BORING_VAULT_ADDRESS,
      });
    });
  });

  describe('chain configuration', () => {
    it('does not add the chain if it is already configured', async () => {
      const { requestMock, baseMessenger } = getInitRequestMock({
        isUnlocked: true,
      });

      moneyAccountUpgradeControllerInit(requestMock);
      publishFlagOn(baseMessenger);
      await flushAsync();

      expect(mockAddNetwork).not.toHaveBeenCalled();
      expect(mockedController.init).toHaveBeenCalled();
    });

    it('adds the chain from PopularList when it is not configured', async () => {
      jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({});

      const { requestMock, baseMessenger } = getInitRequestMock({
        isUnlocked: true,
      });

      moneyAccountUpgradeControllerInit(requestMock);
      publishFlagOn(baseMessenger);
      await flushAsync();

      expect(mockAddNetwork).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: VAULT_CHAIN_ID,
          name: 'Monad',
        }),
      );
      expect(mockedController.init).toHaveBeenCalled();
    });

    it('logs an error when the missing chain is not in PopularList', async () => {
      const UNSUPPORTED_CHAIN_ID = '0xdeadbeef' as Hex;
      jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({});

      const { requestMock, baseMessenger } = getInitRequestMock({
        isUnlocked: true,
      });

      moneyAccountUpgradeControllerInit(requestMock);
      // @ts-expect-error: Event not allowed on the mock messenger namespace.
      baseMessenger.publish('RemoteFeatureFlagController:stateChange', {
        remoteFeatureFlags: {
          moneyAccountVaultConfig: {
            ...VAULT_CONFIG,
            chainId: UNSUPPORTED_CHAIN_ID,
          },
        },
        localOverrides: {},
      });
      await flushAsync();

      expect(mockAddNetwork).not.toHaveBeenCalled();
      expect(mockedController.init).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(UNSUPPORTED_CHAIN_ID),
        }),
        expect.objectContaining({
          tags: expect.objectContaining({ feature: 'money-account-upgrade' }),
          context: expect.objectContaining({ name: 'money_account_upgrade' }),
        }),
      );
    });
  });
});
