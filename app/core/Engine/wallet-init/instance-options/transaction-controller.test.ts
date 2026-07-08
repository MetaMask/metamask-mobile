import { it as jestIt } from '@jest/globals';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
  Messenger,
} from '@metamask/messenger';
import {
  TransactionMeta,
  TransactionType,
  TransactionStatus,
} from '@metamask/transaction-controller';

import type { RootState } from '../../../../reducers';
import * as sentinelApiModule from '../../../../util/transactions/sentinel-api';
import * as accountSupports7702Module from '../../../../util/transactions/account-supports-7702';
import * as smartTransactionSelectors from '../../../../selectors/smartTransactionsController';
import {
  getTransactionControllerInitMessenger,
  type TransactionControllerInitMessengerActions,
  type TransactionControllerInitMessengerEvents,
} from '../messengers/transaction-controller-messenger';
import {
  getTransactionControllerInstanceOptions,
  setupTransactionControllerListeners,
} from './transaction-controller';
import { handleShowNotification } from '../../controllers/transaction-controller/event-handlers/notification';
import {
  handleTransactionAddedEventForMetrics,
  handleTransactionApprovedEventForMetrics,
  handleTransactionFinalizedEventForMetrics,
  handleTransactionRejectedEventForMetrics,
  handleTransactionSubmittedEventForMetrics,
} from '../../controllers/transaction-controller/event-handlers/metrics';
import { handleUnapprovedTransactionAddedForMoneyAccount } from '../../controllers/transaction-controller/event-handlers/money-account-override';

jest.mock('../../../../util/transactions/sentinel-api');
jest.mock('../../../../util/transactions/account-supports-7702');
jest.mock('../../../../selectors/smartTransactionsController');
jest.mock('../../../../util/transactions/hooks', () => ({
  getTransactionControllerHooks: jest.fn(() => ({ beforeSign: jest.fn() })),
}));
jest.mock(
  '../../controllers/transaction-controller/event-handlers/notification',
);
jest.mock('../../controllers/transaction-controller/event-handlers/metrics');
jest.mock(
  '../../controllers/transaction-controller/event-handlers/money-account-override',
);

const CHAIN_ID_MOCK = '0x1';

function buildRootMessenger() {
  return new Messenger<
    MockAnyNamespace,
    TransactionControllerInitMessengerActions,
    TransactionControllerInitMessengerEvents
  >({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('TransactionController wallet instance options', () => {
  const selectShouldUseSmartTransactionMock = jest.mocked(
    smartTransactionSelectors.selectShouldUseSmartTransaction,
  );
  const isSendBundleSupportedMock = jest.mocked(
    sentinelApiModule.isSendBundleSupported,
  );
  const accountSupports7702Mock = jest.mocked(
    accountSupports7702Module.accountSupports7702,
  );

  const getState = jest.fn(() => ({}) as RootState);

  function buildOptions({
    preferencesState = {
      securityAlertsEnabled: false,
      useTransactionSimulations: false,
    },
  }: {
    preferencesState?: Record<string, unknown>;
  } = {}) {
    const rootMessenger = buildRootMessenger();

    rootMessenger.registerActionHandler(
      'PreferencesController:getState',
      () => preferencesState as never,
    );

    const initMessenger = getTransactionControllerInitMessenger(rootMessenger);

    return getTransactionControllerInstanceOptions({
      getState,
      getTransactionController: jest.fn(),
      initMessenger,
    });
  }

  function testConstructorOption<
    Option extends keyof ReturnType<typeof buildOptions>,
  >(
    option: Option,
    overrides: {
      preferencesState?: Record<string, unknown>;
    } = {},
  ): ReturnType<typeof buildOptions>[Option] {
    return buildOptions(overrides)[option];
  }

  beforeEach(() => {
    jest.clearAllMocks();
    isSendBundleSupportedMock.mockResolvedValue(false);
    accountSupports7702Mock.mockResolvedValue(true);
  });

  it('disables swaps', () => {
    expect(testConstructorOption('disableSwaps')).toBe(true);
  });

  it('determines if first time interaction is enabled using preferences', () => {
    const isFirstTimeInteractionEnabled = testConstructorOption(
      'isFirstTimeInteractionEnabled',
      {
        preferencesState: {
          securityAlertsEnabled: true,
        },
      },
    );

    expect(isFirstTimeInteractionEnabled?.()).toBe(true);
  });

  it('determines if simulation is enabled using preferences', () => {
    const isSimulationEnabled = testConstructorOption('isSimulationEnabled', {
      preferencesState: {
        useTransactionSimulations: true,
      },
    });

    expect(isSimulationEnabled?.()).toBe(true);
  });

  describe('isAutomaticGasFeeUpdateEnabled', () => {
    function buildTransactionMeta(
      overrides: Partial<TransactionMeta> = {},
    ): TransactionMeta {
      return {
        id: '1',
        type: TransactionType.contractInteraction,
        chainId: CHAIN_ID_MOCK,
        networkClientId: 'test-network',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        txParams: {
          from: '0x0000000000000000000000000000000000000000',
        },
        ...overrides,
      };
    }

    jestIt.each([
      ['stakingDeposit', TransactionType.stakingDeposit, true],
      ['contractInteraction', TransactionType.contractInteraction, true],
      ['swap', TransactionType.swap, false],
    ])('returns %s for %s transactions', (_label, type, expected) => {
      const isAutomaticGasFeeUpdateEnabled = testConstructorOption(
        'isAutomaticGasFeeUpdateEnabled',
      );

      expect(
        isAutomaticGasFeeUpdateEnabled?.(buildTransactionMeta({ type })),
      ).toBe(expected);
    });

    it('returns false for tokenMethodApprove with ORIGIN_METAMASK', () => {
      const isAutomaticGasFeeUpdateEnabled = testConstructorOption(
        'isAutomaticGasFeeUpdateEnabled',
      );

      expect(
        isAutomaticGasFeeUpdateEnabled?.(
          buildTransactionMeta({
            type: TransactionType.tokenMethodApprove,
            origin: ORIGIN_METAMASK,
          }),
        ),
      ).toBe(false);
    });
  });

  describe('isEIP7702GasFeeTokensEnabled', () => {
    const mockTransactionMeta = {
      id: '1',
      networkClientId: 'test-network',
      status: TransactionStatus.unapproved,
      chainId: CHAIN_ID_MOCK,
      time: Date.now(),
      txParams: {
        from: '0x0000000000000000000000000000000000000000',
      },
    } as TransactionMeta;

    it('returns false when account does not support 7702', async () => {
      accountSupports7702Mock.mockResolvedValue(false);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(await optionFn?.(mockTransactionMeta)).toBe(false);
    });

    it('returns true when smart transactions disabled and send bundle not supported', async () => {
      selectShouldUseSmartTransactionMock.mockReturnValue(false);
      isSendBundleSupportedMock.mockResolvedValue(false);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(await optionFn?.(mockTransactionMeta)).toBe(true);
    });

    it('returns false when smart transactions enabled and send bundle supported', async () => {
      selectShouldUseSmartTransactionMock.mockReturnValue(true);
      isSendBundleSupportedMock.mockResolvedValue(true);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(await optionFn?.(mockTransactionMeta)).toBe(false);
    });

    it('returns true when isExternalSign is true', async () => {
      selectShouldUseSmartTransactionMock.mockReturnValue(true);
      isSendBundleSupportedMock.mockResolvedValue(true);

      const optionFn = testConstructorOption('isEIP7702GasFeeTokensEnabled');

      expect(
        await optionFn?.({
          ...mockTransactionMeta,
          isExternalSign: true,
        }),
      ).toBe(true);
    });
  });
});

describe('setupTransactionControllerListeners', () => {
  const getState = jest.fn(() => ({}) as RootState);

  const MOCK_TRANSACTION_META = {
    id: '123',
    chainId: CHAIN_ID_MOCK,
    status: TransactionStatus.approved,
    time: 123,
    txParams: { from: '0x123' },
    networkClientId: 'selectedNetworkClientId',
  } as TransactionMeta;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setup() {
    const rootMessenger = buildRootMessenger();
    const initMessenger = getTransactionControllerInitMessenger(rootMessenger);
    setupTransactionControllerListeners({
      getState,
      messenger: initMessenger,
    });
    return { rootMessenger };
  }

  it('shows a notification and records metrics on transactionApproved', () => {
    const { rootMessenger } = setup();

    rootMessenger.publish('TransactionController:transactionApproved', {
      transactionMeta: MOCK_TRANSACTION_META,
    });

    expect(handleShowNotification).toHaveBeenCalledWith(MOCK_TRANSACTION_META);
    expect(handleTransactionApprovedEventForMetrics).toHaveBeenCalledWith(
      MOCK_TRANSACTION_META,
      expect.objectContaining({ getState, initMessenger: expect.anything() }),
    );
  });

  it('records finalized metrics on transactionConfirmed', () => {
    const { rootMessenger } = setup();

    rootMessenger.publish(
      'TransactionController:transactionConfirmed',
      MOCK_TRANSACTION_META,
    );

    expect(handleTransactionFinalizedEventForMetrics).toHaveBeenCalledWith(
      MOCK_TRANSACTION_META,
      expect.anything(),
    );
  });

  it('records finalized metrics on transactionDropped', () => {
    const { rootMessenger } = setup();

    rootMessenger.publish('TransactionController:transactionDropped', {
      transactionMeta: MOCK_TRANSACTION_META,
    });

    expect(handleTransactionFinalizedEventForMetrics).toHaveBeenCalled();
  });

  it('records finalized metrics on transactionFailed', () => {
    const { rootMessenger } = setup();

    rootMessenger.publish('TransactionController:transactionFailed', {
      transactionMeta: MOCK_TRANSACTION_META,
      error: 'error',
    });

    expect(handleTransactionFinalizedEventForMetrics).toHaveBeenCalled();
  });

  it('records rejected metrics on transactionRejected', () => {
    const { rootMessenger } = setup();

    rootMessenger.publish('TransactionController:transactionRejected', {
      transactionMeta: MOCK_TRANSACTION_META,
    });

    expect(handleTransactionRejectedEventForMetrics).toHaveBeenCalled();
  });

  it('records submitted metrics on transactionSubmitted', () => {
    const { rootMessenger } = setup();

    rootMessenger.publish('TransactionController:transactionSubmitted', {
      transactionMeta: MOCK_TRANSACTION_META,
    });

    expect(handleTransactionSubmittedEventForMetrics).toHaveBeenCalled();
  });

  it('records added metrics and money-account override on unapprovedTransactionAdded', () => {
    const { rootMessenger } = setup();

    rootMessenger.publish(
      'TransactionController:unapprovedTransactionAdded',
      MOCK_TRANSACTION_META,
    );

    expect(handleTransactionAddedEventForMetrics).toHaveBeenCalled();
    expect(handleUnapprovedTransactionAddedForMoneyAccount).toHaveBeenCalledWith(
      MOCK_TRANSACTION_META,
    );
  });
});
