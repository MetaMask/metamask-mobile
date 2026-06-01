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
import {
  type MoneyAccountVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../selectors/featureFlagController/moneyAccount';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import {
  __resetMoneyAccountUpgradeBootstrapForTesting,
  moneyAccountUpgradeControllerInit,
  whenMoneyAccountUpgradeReady,
} from './money-account-upgrade-controller-init';
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

jest.mock('../../../selectors/featureFlagController/moneyAccount');

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
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

function getInitRequestMock({ isUnlocked }: { isUnlocked: boolean }) {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on the mock messenger namespace.
    'KeyringController:getState',
    jest.fn().mockReturnValue({ isUnlocked }),
  );

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger:
      getMoneyAccountUpgradeControllerMessenger(baseMessenger),
    initMessenger: getMoneyAccountUpgradeControllerInitMessenger(baseMessenger),
  };

  return { requestMock, baseMessenger };
}

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
    jest.mocked(selectMoneyAccountVaultConfig).mockReturnValue(VAULT_CONFIG);
    jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({
      [VAULT_CHAIN_ID]: {
        chainId: VAULT_CHAIN_ID,
      } as never,
    });
  });

  const mockAddNetwork = Engine.context.NetworkController
    .addNetwork as jest.Mock;

  it('returns a MoneyAccountUpgradeController instance', () => {
    const { requestMock } = getInitRequestMock({ isUnlocked: false });

    const { controller } = moneyAccountUpgradeControllerInit(requestMock);

    expect(controller).toBe(mockedController);
  });

  describe('whenMoneyAccountUpgradeReady', () => {
    it('rejects when bootstrap has not been scheduled yet', async () => {
      await expect(whenMoneyAccountUpgradeReady()).rejects.toThrow(
        'MoneyAccountUpgradeController bootstrap has not been scheduled yet',
      );
    });

    it('resolves once bootstrap completes when keyring is already unlocked', async () => {
      const { requestMock } = getInitRequestMock({ isUnlocked: true });

      moneyAccountUpgradeControllerInit(requestMock);

      await expect(whenMoneyAccountUpgradeReady()).resolves.toBeUndefined();
      expect(mockedController.init).toHaveBeenCalledTimes(1);
    });
  });

  it('initializes the controller with the chainId and boring vault address from the vault config when unlocked', async () => {
    const { requestMock } = getInitRequestMock({ isUnlocked: true });

    moneyAccountUpgradeControllerInit(requestMock);
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
    // @ts-expect-error: Event not allowed on the mock messenger namespace.
    baseMessenger.publish('KeyringController:unlock');
    // @ts-expect-error: Event not allowed on the mock messenger namespace.
    baseMessenger.publish('KeyringController:unlock');
    await flushAsync();

    expect(mockedController.init).toHaveBeenCalledTimes(1);
  });

  it('logs an error when the vault config is missing', async () => {
    jest.mocked(selectMoneyAccountVaultConfig).mockReturnValue(undefined);
    const { requestMock } = getInitRequestMock({ isUnlocked: true });

    moneyAccountUpgradeControllerInit(requestMock);
    await flushAsync();

    expect(mockedController.init).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Missing Money Account vault config',
      }),
      'MoneyAccountUpgradeController bootstrap',
    );
  });

  describe('chain configuration', () => {
    it('does not add the chain if it is already configured', async () => {
      const { requestMock } = getInitRequestMock({ isUnlocked: true });

      moneyAccountUpgradeControllerInit(requestMock);
      await flushAsync();

      expect(mockAddNetwork).not.toHaveBeenCalled();
      expect(mockedController.init).toHaveBeenCalled();
    });

    it('adds the chain from PopularList when it is not configured', async () => {
      jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({});

      const { requestMock } = getInitRequestMock({ isUnlocked: true });

      moneyAccountUpgradeControllerInit(requestMock);
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
      jest.mocked(selectMoneyAccountVaultConfig).mockReturnValue({
        ...VAULT_CONFIG,
        chainId: UNSUPPORTED_CHAIN_ID,
      });
      jest.mocked(selectEvmNetworkConfigurationsByChainId).mockReturnValue({});

      const { requestMock } = getInitRequestMock({ isUnlocked: true });

      moneyAccountUpgradeControllerInit(requestMock);
      await flushAsync();

      expect(mockAddNetwork).not.toHaveBeenCalled();
      expect(mockedController.init).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(UNSUPPORTED_CHAIN_ID),
        }),
        'MoneyAccountUpgradeController bootstrap',
      );
    });
  });
});
