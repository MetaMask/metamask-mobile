import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';
import { ethers } from 'ethers';
import Engine from '../../../../core/Engine';
import {
  useMoneyTransactionStatus,
  formatMusdAmountForToast,
  IN_PROGRESS_DELAY_MS,
} from './useMoneyTransactionStatus';
import useMoneyToasts, { MoneyToastOptionsConfig } from './useMoneyToasts';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NotificationMoment } from '../../../../util/haptics';
import { TOAST_TRACKING_CLEANUP_DELAY_MS } from '../../Earn/constants/musd';

jest.mock('../../../../core/Engine');
jest.mock('./useMoneyToasts');
jest.mock('../../../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('../../../../selectors/tokenRatesController', () => ({
  ...jest.requireActual('../../../../selectors/tokenRatesController'),
  selectTokenMarketData: jest.fn(() => undefined),
}));
jest.mock('../../../../selectors/currencyRateController', () => ({
  ...jest.requireActual('../../../../selectors/currencyRateController'),
  selectCurrencyRates: jest.fn(() => undefined),
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));
jest.mock('../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../selectors/networkController'),
  selectNetworkConfigurations: jest.fn(() => undefined),
}));
jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => ({
    colors: {
      success: { default: '#success' },
      error: { default: '#error' },
      icon: { default: '#icon' },
      background: { default: '#bg' },
      primary: { default: '#primary' },
    },
  })),
  mockTheme: {
    colors: {
      success: { default: '#success' },
      error: { default: '#error' },
      icon: { default: '#icon' },
      background: { default: '#bg' },
      primary: { default: '#primary' },
    },
  },
}));

type TransactionStatusUpdatedHandler = (event: {
  transactionMeta: TransactionMeta;
}) => void;
type TransactionConfirmedHandler = (transactionMeta: TransactionMeta) => void;

const mockSubscribe = jest.fn<
  void,
  [string, TransactionStatusUpdatedHandler | TransactionConfirmedHandler]
>();
const mockUnsubscribe = jest.fn<
  void,
  [string, TransactionStatusUpdatedHandler | TransactionConfirmedHandler]
>();

Object.defineProperty(Engine, 'controllerMessenger', {
  value: { subscribe: mockSubscribe, unsubscribe: mockUnsubscribe },
  writable: true,
  configurable: true,
});

const mockUseMoneyToasts = jest.mocked(useMoneyToasts);

const TELLER_INTERFACE = new ethers.utils.Interface([
  'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress) payable returns (uint256 shares)',
  'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
]);

const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

const encodeDepositData = (amountWei: bigint) =>
  TELLER_INTERFACE.encodeFunctionData('deposit', [
    MUSD_ADDRESS,
    amountWei.toString(),
    '0',
    '0x0000000000000000000000000000000000000000',
  ]);

const encodeWithdrawData = (amountWei: bigint) =>
  TELLER_INTERFACE.encodeFunctionData('withdraw', [
    MUSD_ADDRESS,
    '0',
    amountWei.toString(),
    '0x0000000000000000000000000000000000000000',
  ]);

const buildTxMeta = (overrides: Partial<TransactionMeta>): TransactionMeta =>
  ({
    id: 'tx-id-1',
    chainId: '0x1',
    status: TransactionStatus.unapproved,
    type: TransactionType.moneyAccountDeposit,
    txParams: { from: '0x0', data: '0x' },
    ...overrides,
  }) as unknown as TransactionMeta;

describe('useMoneyTransactionStatus', () => {
  const mockShowToast = jest.fn();

  const baseInProgressToast = {
    variant: ToastVariants.Icon as const,
    iconName: IconName.Loading,
    hasNoTimeout: true,
    hapticsType: NotificationMoment.Warning,
    labelOptions: [{ label: 'In progress', isBold: true }],
  };
  const baseSuccessToast = {
    variant: ToastVariants.Icon as const,
    iconName: IconName.Confirmation,
    hasNoTimeout: false,
    iconColor: '#success',
    hapticsType: NotificationMoment.Success,
    labelOptions: [{ label: 'Success', isBold: true }],
  };
  const baseFailedToast = {
    variant: ToastVariants.Icon as const,
    iconName: IconName.CircleX,
    hasNoTimeout: false,
    iconColor: '#error',
    hapticsType: NotificationMoment.Error,
    labelOptions: [{ label: 'Failed', isBold: true }],
  };

  const depositInProgressFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['deposit']['inProgress']>,
    Parameters<MoneyToastOptionsConfig['deposit']['inProgress']>
  >(() => baseInProgressToast);
  const depositSuccessFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['deposit']['success']>,
    Parameters<MoneyToastOptionsConfig['deposit']['success']>
  >(() => baseSuccessToast);
  const depositFailedFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['deposit']['failed']>,
    Parameters<MoneyToastOptionsConfig['deposit']['failed']>
  >(() => baseFailedToast);
  const withdrawInProgressFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['withdraw']['inProgress']>,
    Parameters<MoneyToastOptionsConfig['withdraw']['inProgress']>
  >(() => baseInProgressToast);
  const withdrawSuccessFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['withdraw']['success']>,
    Parameters<MoneyToastOptionsConfig['withdraw']['success']>
  >(() => baseSuccessToast);
  const withdrawFailedFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['withdraw']['failed']>,
    Parameters<MoneyToastOptionsConfig['withdraw']['failed']>
  >(() => baseFailedToast);

  const moneyToastOptions: MoneyToastOptionsConfig = {
    deposit: {
      inProgress: depositInProgressFn,
      success: depositSuccessFn,
      failed: depositFailedFn,
    },
    withdraw: {
      inProgress: withdrawInProgressFn,
      success: withdrawSuccessFn,
      failed: withdrawFailedFn,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseMoneyToasts.mockReturnValue({
      showToast: mockShowToast,
      MoneyToastOptions: moneyToastOptions,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const renderAndGetHandlers = () => {
    renderHook(() => useMoneyTransactionStatus());
    const findHandler = (eventName: string) =>
      mockSubscribe.mock.calls.find(([event]) => event === eventName)?.[1];
    return {
      approvedHandler: findHandler(
        'TransactionController:transactionApproved',
      ) as TransactionStatusUpdatedHandler,
      failedHandler: findHandler(
        'TransactionController:transactionFailed',
      ) as TransactionStatusUpdatedHandler,
      droppedHandler: findHandler(
        'TransactionController:transactionDropped',
      ) as TransactionStatusUpdatedHandler,
      statusUpdatedHandler: findHandler(
        'TransactionController:transactionStatusUpdated',
      ) as TransactionStatusUpdatedHandler,
      confirmedHandler: findHandler(
        'TransactionController:transactionConfirmed',
      ) as TransactionConfirmedHandler,
    };
  };

  it('subscribes to and unsubscribes from all transaction events', () => {
    const events = [
      'TransactionController:transactionApproved',
      'TransactionController:transactionFailed',
      'TransactionController:transactionDropped',
      'TransactionController:transactionStatusUpdated',
      'TransactionController:transactionConfirmed',
    ];

    const { unmount } = renderHook(() => useMoneyTransactionStatus());

    events.forEach((event) => {
      expect(mockSubscribe).toHaveBeenCalledWith(event, expect.any(Function));
    });

    unmount();

    events.forEach((event) => {
      expect(mockUnsubscribe).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });

  it('ignores non-Money Account transaction types', () => {
    const { statusUpdatedHandler } = renderAndGetHandlers();

    statusUpdatedHandler({
      transactionMeta: buildTxMeta({
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
      }),
    });

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(depositInProgressFn).not.toHaveBeenCalled();
  });

  describe('deposit lifecycle', () => {
    it('approved → in-progress toast (after deferral)', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.approved,
        }),
      });

      expect(depositInProgressFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(baseInProgressToast);
    });

    it('confirmed → success toast with decoded fiat amount', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeDepositData(BigInt(12_340_000)),
          },
        }),
      );

      expect(depositSuccessFn).toHaveBeenCalledTimes(1);
      const params = depositSuccessFn.mock.calls[0][0];
      expect(params.amountFiat).toContain('mUSD');
      expect(params.amountFiat).toContain('12.34');
    });

    it('failed → deposit failed toast', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.failed,
        }),
      });

      expect(depositFailedFn).toHaveBeenCalledTimes(1);
      expect(withdrawFailedFn).not.toHaveBeenCalled();
    });

    it.each([
      ['dropped', TransactionStatus.dropped],
      ['rejected', TransactionStatus.rejected],
      ['cancelled', TransactionStatus.cancelled],
    ])('statusUpdated with %s → deposit failed toast', (_label, status) => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status,
        }),
      });

      expect(depositFailedFn).toHaveBeenCalledTimes(1);
    });

    it('transactionApproved event also fires in-progress (relay-strategy path)', () => {
      const { approvedHandler } = renderAndGetHandlers();

      approvedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.approved,
        }),
      });

      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).toHaveBeenCalledTimes(1);
    });

    it('transactionFailed event fires deposit failure (relay rejection)', () => {
      const { failedHandler } = renderAndGetHandlers();

      failedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.failed,
        }),
      });

      expect(depositFailedFn).toHaveBeenCalledTimes(1);
    });

    it('transactionDropped event fires deposit failure', () => {
      const { droppedHandler } = renderAndGetHandlers();

      droppedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.dropped,
        }),
      });

      expect(depositFailedFn).toHaveBeenCalledTimes(1);
    });

    it('dedupes when both transactionApproved and transactionStatusUpdated fire for the same tx', () => {
      const { approvedHandler, statusUpdatedHandler } = renderAndGetHandlers();

      const event = {
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.approved,
        }),
      };
      approvedHandler(event);
      statusUpdatedHandler(event);

      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).toHaveBeenCalledTimes(1);
    });

    it('dedupes when both transactionFailed and transactionStatusUpdated fire for the same tx', () => {
      const { failedHandler, statusUpdatedHandler } = renderAndGetHandlers();

      const event = {
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.failed,
        }),
      };
      failedHandler(event);
      statusUpdatedHandler(event);

      expect(depositFailedFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('withdraw lifecycle', () => {
    it('approved → in-progress toast (withdraw namespace, after deferral)', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.approved,
        }),
      });

      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(withdrawInProgressFn).toHaveBeenCalledTimes(1);
      expect(depositInProgressFn).not.toHaveBeenCalled();
    });

    it('confirmed → success toast with destination and decoded amount', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeWithdrawData(BigInt(50_000_000)),
          },
        }),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      const params = withdrawSuccessFn.mock.calls[0][0];
      expect(params.amountFiat).toContain('50.00');
      expect(params.destination).toBeDefined();
    });

    it('failed → withdraw failed toast', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.failed,
        }),
      });

      expect(withdrawFailedFn).toHaveBeenCalledTimes(1);
      expect(depositFailedFn).not.toHaveBeenCalled();
    });
  });

  describe('dedup + cleanup', () => {
    it('does not fire the same status+id toast twice', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      const event = {
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.approved,
        }),
      };
      statusUpdatedHandler(event);
      statusUpdatedHandler(event);

      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).toHaveBeenCalledTimes(1);
    });

    it('allows the same id+status after the cleanup delay', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      const failedEvent = {
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.failed,
        }),
      };
      statusUpdatedHandler(failedEvent);
      expect(depositFailedFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(TOAST_TRACKING_CLEANUP_DELAY_MS + 1);

      statusUpdatedHandler(failedEvent);
      expect(depositFailedFn).toHaveBeenCalledTimes(2);
    });

    it('ignores transactionConfirmed events with non-confirmed status', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.failed,
        }),
      );

      expect(depositSuccessFn).not.toHaveBeenCalled();
    });
  });

  describe('formatMusdAmountForToast', () => {
    it('falls back to mUSD format when no fiat rate is available', () => {
      expect(formatMusdAmountForToast(BigInt(1_000_000))).toBe('1.00 mUSD');
      expect(formatMusdAmountForToast(BigInt(123_456))).toBe('0.12 mUSD');
    });

    it('formats as fiat when token market data, currency rates and network config resolve', () => {
      const tokenRatesMock = jest.requireMock(
        '../../../../selectors/tokenRatesController',
      );
      const currencyRatesMock = jest.requireMock(
        '../../../../selectors/currencyRateController',
      );
      const networkConfigMock = jest.requireMock(
        '../../../../selectors/networkController',
      );
      tokenRatesMock.selectTokenMarketData.mockReturnValueOnce({
        '0x1': {
          '0xacA92E438df0B2401fF60dA7E4337B687a2435DA': { price: 1 },
        },
      });
      currencyRatesMock.selectCurrencyRates.mockReturnValueOnce({
        ETH: { conversionRate: 2 },
      });
      networkConfigMock.selectNetworkConfigurations.mockReturnValueOnce({
        '0x1': { nativeCurrency: 'ETH' },
      });
      currencyRatesMock.selectCurrentCurrency.mockReturnValueOnce('usd');

      const formatted = formatMusdAmountForToast(BigInt(5_000_000));
      expect(formatted).not.toContain('mUSD');
      expect(formatted).toMatch(/10/);
    });
  });

  describe('handler resilience', () => {
    it('ignores non-terminal statuses (e.g. submitted) in transactionStatusUpdated', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.submitted,
        }),
      });

      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('still shows success toast when txParams.data is malformed', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
          txParams: { from: '0x0', data: '0xdeadbeef' },
        }),
      );

      expect(depositSuccessFn).toHaveBeenCalledWith({ amountFiat: '' });
    });
  });

  describe('deferred in-progress', () => {
    it('does not show in-progress when transaction confirms before the delay elapses', () => {
      const { approvedHandler, confirmedHandler } = renderAndGetHandlers();

      const tx = buildTxMeta({
        type: TransactionType.moneyAccountDeposit,
        status: TransactionStatus.approved,
        txParams: { from: '0x0', data: encodeDepositData(BigInt(1_000_000)) },
      });
      approvedHandler({ transactionMeta: tx });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS - 1);
      confirmedHandler({ ...tx, status: TransactionStatus.confirmed });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(depositSuccessFn).toHaveBeenCalledTimes(1);
    });

    it('does not show in-progress when transaction fails before the delay elapses', () => {
      const { approvedHandler, failedHandler } = renderAndGetHandlers();

      const tx = buildTxMeta({
        type: TransactionType.moneyAccountDeposit,
        status: TransactionStatus.approved,
      });
      approvedHandler({ transactionMeta: tx });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS - 1);
      failedHandler({
        transactionMeta: { ...tx, status: TransactionStatus.failed },
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(depositFailedFn).toHaveBeenCalledTimes(1);
    });

    it('does not show in-progress when transaction drops before the delay elapses', () => {
      const { approvedHandler, droppedHandler } = renderAndGetHandlers();

      const tx = buildTxMeta({
        type: TransactionType.moneyAccountDeposit,
        status: TransactionStatus.approved,
      });
      approvedHandler({ transactionMeta: tx });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS - 1);
      droppedHandler({
        transactionMeta: { ...tx, status: TransactionStatus.dropped },
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(depositFailedFn).toHaveBeenCalledTimes(1);
    });

    it('shows in-progress after the delay when no terminal event arrives', () => {
      const { approvedHandler } = renderAndGetHandlers();

      approvedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.approved,
        }),
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(withdrawInProgressFn).toHaveBeenCalledTimes(1);
    });

    it('clears pending in-progress timers on unmount', () => {
      const { unmount } = renderHook(() => useMoneyTransactionStatus());
      const approvedHandler = mockSubscribe.mock.calls.find(
        ([event]) => event === 'TransactionController:transactionApproved',
      )?.[1] as TransactionStatusUpdatedHandler;

      approvedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.approved,
        }),
      });

      unmount();
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).not.toHaveBeenCalled();
    });
  });

  describe('EIP-7702 batched transactions', () => {
    const batchTxWith = (
      nestedType: TransactionType,
      overrides: Partial<TransactionMeta> = {},
    ): TransactionMeta =>
      ({
        id: 'batch-tx-1',
        chainId: '0x1',
        status: TransactionStatus.unapproved,
        type: TransactionType.batch,
        txParams: { from: '0x0', data: '0x' },
        nestedTransactions: [{ type: nestedType, data: '0x' }],
        ...overrides,
      }) as unknown as TransactionMeta;

    it('treats type="batch" with nested moneyAccountDeposit as a deposit', () => {
      const { approvedHandler } = renderAndGetHandlers();

      approvedHandler({
        transactionMeta: batchTxWith(TransactionType.moneyAccountDeposit, {
          status: TransactionStatus.approved,
        }),
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).toHaveBeenCalledTimes(1);
      expect(withdrawInProgressFn).not.toHaveBeenCalled();
    });

    it('treats type="batch" with nested moneyAccountWithdraw as a withdraw', () => {
      const { failedHandler } = renderAndGetHandlers();

      failedHandler({
        transactionMeta: batchTxWith(TransactionType.moneyAccountWithdraw, {
          status: TransactionStatus.failed,
        }),
      });

      expect(withdrawFailedFn).toHaveBeenCalledTimes(1);
      expect(depositFailedFn).not.toHaveBeenCalled();
    });

    it('ignores type="batch" without any Money-Account nested types', () => {
      const { approvedHandler } = renderAndGetHandlers();

      approvedHandler({
        transactionMeta: batchTxWith(TransactionType.simpleSend, {
          status: TransactionStatus.approved,
        }),
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('decodes amount from nested deposit tx data on confirmation', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        batchTxWith(TransactionType.moneyAccountDeposit, {
          status: TransactionStatus.confirmed,
          nestedTransactions: [
            {
              type: TransactionType.moneyAccountDeposit,
              data: encodeDepositData(BigInt(7_770_000)) as `0x${string}`,
            },
          ],
        }),
      );

      expect(depositSuccessFn).toHaveBeenCalledTimes(1);
      expect(depositSuccessFn.mock.calls[0][0].amountFiat).toContain('7.77');
    });

    it('decodes amount from nested withdraw tx data on confirmation', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        batchTxWith(TransactionType.moneyAccountWithdraw, {
          status: TransactionStatus.confirmed,
          nestedTransactions: [
            {
              type: TransactionType.moneyAccountWithdraw,
              data: encodeWithdrawData(BigInt(33_330_000)) as `0x${string}`,
            },
          ],
        }),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      expect(withdrawSuccessFn.mock.calls[0][0].amountFiat).toContain('33.33');
    });
  });
});
