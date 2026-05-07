import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MoneyAccountUpgradeController } from '@metamask/money-account-upgrade-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import {
  getMoneyAccountUpgradeControllerInitMessenger,
  getMoneyAccountUpgradeControllerMessenger,
} from '../messengers/money-account-upgrade-controller-messenger';
import { getDeleGatorEnvironment } from '../../Delegation/environment';
import {
  __resetMoneyAccountUpgradeBootstrapForTesting,
  moneyAccountUpgradeControllerInit,
  whenMoneyAccountUpgradeReady,
} from './money-account-upgrade-controller-init';
import Logger from '../../../util/Logger';

jest.mock('@metamask/money-account-upgrade-controller');

jest.mock('../../Delegation/environment', () => ({
  getDeleGatorEnvironment: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const MUSD_TOKEN_ADDRESS = '0x000000000000000000000000000000000000dead';
const DELEGATOR_IMPL = '0x0000000000000000000000000000000000000001';
const REDEEMER_ENFORCER = '0x0000000000000000000000000000000000000002';
const VALUE_LTE_ENFORCER = '0x0000000000000000000000000000000000000003';

const SERVICE_DETAILS = {
  chains: {
    [CHAIN_IDS.ARBITRUM]: {
      protocol: {
        vedaProtocol: {
          supportedTokens: [{ tokenAddress: MUSD_TOKEN_ADDRESS }],
        },
      },
    },
  },
};

function getInitRequestMock({
  isUnlocked,
  serviceDetails = SERVICE_DETAILS,
}: {
  isUnlocked: boolean;
  serviceDetails?: unknown;
}) {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on the mock messenger namespace.
    'KeyringController:getState',
    jest.fn().mockReturnValue({ isUnlocked }),
  );

  const getServiceDetails = jest.fn().mockResolvedValue(serviceDetails);
  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed on the mock messenger namespace.
    'ChompApiService:getServiceDetails',
    getServiceDetails,
  );

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger:
      getMoneyAccountUpgradeControllerMessenger(baseMessenger),
    initMessenger: getMoneyAccountUpgradeControllerInitMessenger(baseMessenger),
  };

  return { requestMock, baseMessenger, getServiceDetails };
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

    jest.mocked(getDeleGatorEnvironment).mockReturnValue({
      EIP7702StatelessDeleGatorImpl: DELEGATOR_IMPL,
      caveatEnforcers: {
        RedeemerEnforcer: REDEEMER_ENFORCER,
        ValueLteEnforcer: VALUE_LTE_ENFORCER,
      },
    } as unknown as ReturnType<typeof getDeleGatorEnvironment>);
  });

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

  it('initializes the controller with addresses from service details and the delegator environment when unlocked', async () => {
    const { requestMock, getServiceDetails } = getInitRequestMock({
      isUnlocked: true,
    });

    moneyAccountUpgradeControllerInit(requestMock);
    await flushAsync();

    expect(getServiceDetails).toHaveBeenCalledWith([CHAIN_IDS.ARBITRUM]);
    expect(getDeleGatorEnvironment).toHaveBeenCalledWith(
      Number(CHAIN_IDS.ARBITRUM),
    );
    expect(mockedController.init).toHaveBeenCalledWith(CHAIN_IDS.ARBITRUM, {
      musdTokenAddress: MUSD_TOKEN_ADDRESS,
      delegatorImplAddress: DELEGATOR_IMPL,
      redeemerEnforcer: REDEEMER_ENFORCER,
      valueLteEnforcer: VALUE_LTE_ENFORCER,
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

  it('logs an error when CHOMP service details are missing', async () => {
    const { requestMock } = getInitRequestMock({
      isUnlocked: true,
      serviceDetails: null,
    });

    moneyAccountUpgradeControllerInit(requestMock);
    await flushAsync();

    expect(mockedController.init).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Missing CHOMP service details for chain ${CHAIN_IDS.ARBITRUM}`,
      }),
      'MoneyAccountUpgradeController bootstrap',
    );
  });

  it('logs an error when the MUSD token address is missing from service details', async () => {
    const { requestMock } = getInitRequestMock({
      isUnlocked: true,
      serviceDetails: {
        chains: {
          [CHAIN_IDS.ARBITRUM]: {
            protocol: { vedaProtocol: { supportedTokens: [] } },
          },
        },
      },
    });

    moneyAccountUpgradeControllerInit(requestMock);
    await flushAsync();

    expect(mockedController.init).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Missing MUSD token address for chain ${CHAIN_IDS.ARBITRUM} in CHOMP service details`,
      }),
      'MoneyAccountUpgradeController bootstrap',
    );
  });
});
