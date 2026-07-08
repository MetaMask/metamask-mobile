import {
  CHAIN_IDS,
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
import {
  clearMoneyAccountDepositIntent,
  getMoneyAccountDepositIntent,
} from './useMoneyAccount';
import { getMemoizedInternalAccountByAddress } from '../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../selectors/multichainAccounts/accountTreeController';

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: jest.fn(() => ({})),
  }),
);

jest.mock('./useMoneyAccount', () => ({
  __esModule: true,
  getMoneyAccountDepositIntent: jest.fn(),
  clearMoneyAccountDepositIntent: jest.fn(),
}));
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
jest.mock('../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../selectors/accountsController'),
  getMemoizedInternalAccountByAddress: jest.fn(() => ({
    metadata: { name: 'Account 1' },
  })),
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
    amountWei.toString(),
    '0',
    '0x0000000000000000000000000000000000000000',
  ]);

const ERC20_TRANSFER_INTERFACE = new ethers.utils.Interface([
  'function transfer(address to, uint256 amount)',
]);

const RECIPIENT_ADDRESS = '0x1111111111111111111111111111111111111111';

const encodeTransferData = (recipient: string, amountWei: bigint = BigInt(0)) =>
  ERC20_TRANSFER_INTERFACE.encodeFunctionData('transfer', [
    recipient,
    amountWei.toString(),
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
  const sendInProgressFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['send']['inProgress']>,
    Parameters<MoneyToastOptionsConfig['send']['inProgress']>
  >(() => baseInProgressToast);
  const sendSuccessFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['send']['success']>,
    Parameters<MoneyToastOptionsConfig['send']['success']>
  >(() => baseSuccessToast);
  const sendFailedFn = jest.fn<
    ReturnType<MoneyToastOptionsConfig['send']['failed']>,
    Parameters<MoneyToastOptionsConfig['send']['failed']>
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
    send: {
      inProgress: sendInProgressFn,
      success: sendSuccessFn,
      failed: sendFailedFn,
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

    it('approved → in-progress toast forwards the batch intent', () => {
      (
        getMoneyAccountDepositIntent as jest.MockedFunction<
          typeof getMoneyAccountDepositIntent
        >
      ).mockReturnValueOnce('addMusd');

      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          id: 'tx-id-intent',
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.approved,
          batchId: '0xINTENTBATCH',
        }),
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(getMoneyAccountDepositIntent).toHaveBeenCalledWith(
        '0xINTENTBATCH',
      );
      expect(depositInProgressFn).toHaveBeenCalledWith({ intent: 'addMusd' });
    });

    it('clears the batch intent on terminal states', () => {
      const { statusUpdatedHandler, confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
          batchId: '0xBATCH_CONFIRMED',
          txParams: {
            from: '0x0',
            data: encodeDepositData(BigInt(1)),
          },
        }),
      );

      expect(clearMoneyAccountDepositIntent).toHaveBeenCalledWith(
        '0xBATCH_CONFIRMED',
      );

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          id: 'tx-id-failed',
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.failed,
          batchId: '0xBATCH_FAILED',
        }),
      });

      expect(clearMoneyAccountDepositIntent).toHaveBeenCalledWith(
        '0xBATCH_FAILED',
      );

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          id: 'tx-id-rejected',
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.rejected,
          batchId: '0xBATCH_REJECTED',
        }),
      });

      expect(clearMoneyAccountDepositIntent).toHaveBeenCalledWith(
        '0xBATCH_REJECTED',
      );
    });

    it('forwards intent to deposit.success on confirmed', () => {
      (
        getMoneyAccountDepositIntent as jest.MockedFunction<
          typeof getMoneyAccountDepositIntent
        >
      ).mockReturnValueOnce('addMusd');

      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.confirmed,
          batchId: '0xBATCH_SUCCESS',
          txParams: {
            from: '0x0',
            data: encodeDepositData(BigInt(12_340_000)),
          },
        }),
      );

      expect(depositSuccessFn).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'addMusd' }),
      );
    });

    it('forwards intent to deposit.failed on failed', () => {
      (
        getMoneyAccountDepositIntent as jest.MockedFunction<
          typeof getMoneyAccountDepositIntent
        >
      ).mockReturnValueOnce('addMusd');

      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          id: 'tx-id-failed-intent',
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.failed,
          batchId: '0xBATCH_FAILED_INTENT',
        }),
      });

      expect(depositFailedFn).toHaveBeenCalledWith({ intent: 'addMusd' });
    });

    describe('intent falls back to the transaction funding method when no batch intent is stored', () => {
      it('derives "card" from a fiat on-ramp deposit', () => {
        const { statusUpdatedHandler } = renderAndGetHandlers();

        statusUpdatedHandler({
          transactionMeta: buildTxMeta({
            id: 'tx-fiat-deposit',
            type: TransactionType.moneyAccountDeposit,
            status: TransactionStatus.approved,
            metamaskPay: { fiat: true },
          } as unknown as Partial<TransactionMeta>),
        });
        jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

        expect(depositInProgressFn).toHaveBeenCalledWith({ intent: 'card' });
      });

      it('derives "addMusd" from a deposit paid with mUSD', () => {
        const { statusUpdatedHandler } = renderAndGetHandlers();

        statusUpdatedHandler({
          transactionMeta: buildTxMeta({
            id: 'tx-musd-deposit',
            type: TransactionType.moneyAccountDeposit,
            status: TransactionStatus.approved,
            metamaskPay: { tokenAddress: MUSD_ADDRESS },
          } as unknown as Partial<TransactionMeta>),
        });
        jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

        expect(depositInProgressFn).toHaveBeenCalledWith({ intent: 'addMusd' });
      });

      it('derives "convert" from a crypto deposit with no fiat/mUSD payment', () => {
        const { statusUpdatedHandler } = renderAndGetHandlers();

        statusUpdatedHandler({
          transactionMeta: buildTxMeta({
            id: 'tx-crypto-deposit',
            type: TransactionType.moneyAccountDeposit,
            status: TransactionStatus.approved,
          }),
        });
        jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

        expect(depositInProgressFn).toHaveBeenCalledWith({ intent: 'convert' });
      });
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

    it('rejected → no toast (user backed out of confirmation)', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          type: TransactionType.moneyAccountDeposit,
          status: TransactionStatus.rejected,
        }),
      });

      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositFailedFn).not.toHaveBeenCalled();
      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('approved → rejected before delay → no toast and pending in-progress cleared', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      const tx = buildTxMeta({
        type: TransactionType.moneyAccountDeposit,
        status: TransactionStatus.approved,
      });
      statusUpdatedHandler({ transactionMeta: tx });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS - 1);
      statusUpdatedHandler({
        transactionMeta: { ...tx, status: TransactionStatus.rejected },
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(depositFailedFn).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
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

    it('confirmed → success toast resolves destination from the nested transfer recipient', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeWithdrawData(BigInt(50_000_000)),
          },
          nestedTransactions: [
            {
              type: TransactionType.tokenMethodTransfer,
              data: encodeTransferData(RECIPIENT_ADDRESS),
            },
          ],
        } as unknown as Partial<TransactionMeta>),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      const params = withdrawSuccessFn.mock.calls[0][0];
      expect(params.amountFiat).toContain('50.00');
      expect(params.destination).toBe('Account 1');
      expect(getMemoizedInternalAccountByAddress).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/^0x1111/i),
      );
    });

    it('falls back to a shortened address when the recipient is not an internal account', () => {
      jest
        .mocked(getMemoizedInternalAccountByAddress)
        .mockReturnValueOnce(undefined);

      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeWithdrawData(BigInt(10_000_000)),
          },
          nestedTransactions: [
            {
              type: TransactionType.tokenMethodTransfer,
              data: encodeTransferData(RECIPIENT_ADDRESS),
            },
          ],
        } as unknown as Partial<TransactionMeta>),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      const destination = withdrawSuccessFn.mock.calls[0][0].destination ?? '';
      expect(destination).toMatch(/^0x[0-9a-fA-F]+\.{3}[0-9a-fA-F]+$/);
    });

    it('falls back to "your account" when the recipient is an internal account with a blank name', () => {
      jest.mocked(getMemoizedInternalAccountByAddress).mockReturnValueOnce({
        metadata: { name: '   ' },
      } as unknown as ReturnType<typeof getMemoizedInternalAccountByAddress>);

      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeWithdrawData(BigInt(10_000_000)),
          },
          nestedTransactions: [
            {
              type: TransactionType.tokenMethodTransfer,
              data: encodeTransferData(RECIPIENT_ADDRESS),
            },
          ],
        } as unknown as Partial<TransactionMeta>),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      expect(withdrawSuccessFn.mock.calls[0][0].destination).toBe(
        'your account',
      );
    });

    it('prefers the account group name over the internal account name', () => {
      jest.mocked(getMemoizedInternalAccountByAddress).mockReturnValueOnce({
        id: 'acc-1',
        metadata: { name: 'Account 1' },
      } as unknown as ReturnType<typeof getMemoizedInternalAccountByAddress>);
      jest.mocked(selectAccountToGroupMap).mockReturnValueOnce({
        'acc-1': { metadata: { name: 'My savings' } },
      } as unknown as ReturnType<typeof selectAccountToGroupMap>);

      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeWithdrawData(BigInt(10_000_000)),
          },
          nestedTransactions: [
            {
              type: TransactionType.tokenMethodTransfer,
              data: encodeTransferData(RECIPIENT_ADDRESS),
            },
          ],
        } as unknown as Partial<TransactionMeta>),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      expect(withdrawSuccessFn.mock.calls[0][0].destination).toBe('My savings');
    });

    it('falls back to the internal account name when no account group is found', () => {
      jest.mocked(getMemoizedInternalAccountByAddress).mockReturnValueOnce({
        id: 'acc-1',
        metadata: { name: 'Account 1' },
      } as unknown as ReturnType<typeof getMemoizedInternalAccountByAddress>);
      jest
        .mocked(selectAccountToGroupMap)
        .mockReturnValueOnce(
          {} as unknown as ReturnType<typeof selectAccountToGroupMap>,
        );

      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeWithdrawData(BigInt(10_000_000)),
          },
          nestedTransactions: [
            {
              type: TransactionType.tokenMethodTransfer,
              data: encodeTransferData(RECIPIENT_ADDRESS),
            },
          ],
        } as unknown as Partial<TransactionMeta>),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      expect(withdrawSuccessFn.mock.calls[0][0].destination).toBe('Account 1');
    });

    it('falls back to "your account" when both group and internal names are blank', () => {
      jest.mocked(getMemoizedInternalAccountByAddress).mockReturnValueOnce({
        id: 'acc-1',
        metadata: { name: '' },
      } as unknown as ReturnType<typeof getMemoizedInternalAccountByAddress>);
      jest.mocked(selectAccountToGroupMap).mockReturnValueOnce({
        'acc-1': { metadata: { name: '  ' } },
      } as unknown as ReturnType<typeof selectAccountToGroupMap>);

      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeWithdrawData(BigInt(10_000_000)),
          },
          nestedTransactions: [
            {
              type: TransactionType.tokenMethodTransfer,
              data: encodeTransferData(RECIPIENT_ADDRESS),
            },
          ],
        } as unknown as Partial<TransactionMeta>),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      expect(withdrawSuccessFn.mock.calls[0][0].destination).toBe(
        'your account',
      );
    });

    it('falls back to "your account" when the nested transfer tx is absent', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          type: TransactionType.moneyAccountWithdraw,
          status: TransactionStatus.confirmed,
          txParams: {
            from: '0x0',
            data: encodeWithdrawData(BigInt(1_000_000)),
          },
        }),
      );

      expect(withdrawSuccessFn).toHaveBeenCalledTimes(1);
      expect(withdrawSuccessFn.mock.calls[0][0].destination).toBe(
        'your account',
      );
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

  describe('perps/predict send lifecycle', () => {
    const buildSendTxMeta = (
      type: TransactionType,
      overrides: Partial<TransactionMeta> = {},
    ): TransactionMeta =>
      buildTxMeta({
        id: 'send-tx-1',
        type,
        metamaskPay: {
          tokenAddress: MUSD_ADDRESS,
          chainId: CHAIN_IDS.MONAD,
          targetFiat: '100',
          totalFiat: '106',
        },
        ...overrides,
      } as unknown as Partial<TransactionMeta>);

    it('approved → send in-progress toast (after deferral), not deposit/withdraw', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildSendTxMeta(TransactionType.perpsDeposit, {
          status: TransactionStatus.approved,
        }),
      });

      expect(sendInProgressFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(sendInProgressFn).toHaveBeenCalledTimes(1);
      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(withdrawInProgressFn).not.toHaveBeenCalled();
    });

    it('confirmed → send success toast uses targetFiat (amount received), not totalFiat (amount + fee), with "Perps" destination', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildSendTxMeta(TransactionType.perpsDeposit, {
          status: TransactionStatus.confirmed,
        }),
      );

      expect(sendSuccessFn).toHaveBeenCalledTimes(1);
      const params = sendSuccessFn.mock.calls[0][0];
      expect(params.amountFiat).toContain('100');
      expect(params.amountFiat).not.toContain('106');
      expect(params.destination).toBe('Perps');
      expect(depositSuccessFn).not.toHaveBeenCalled();
      expect(withdrawSuccessFn).not.toHaveBeenCalled();
    });

    it('confirmed predict deposit → "Predict" destination', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildSendTxMeta(TransactionType.predictDeposit, {
          status: TransactionStatus.confirmed,
        }),
      );

      expect(sendSuccessFn).toHaveBeenCalledTimes(1);
      expect(sendSuccessFn.mock.calls[0][0].destination).toBe('Predict');
    });

    it('confirmed with missing/zero fiat → success without amount', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildSendTxMeta(TransactionType.perpsDeposit, {
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: MUSD_ADDRESS,
            chainId: CHAIN_IDS.MONAD,
            targetFiat: '0',
          },
        } as unknown as Partial<TransactionMeta>),
      );

      expect(sendSuccessFn).toHaveBeenCalledTimes(1);
      expect(sendSuccessFn.mock.calls[0][0].amountFiat).toBeUndefined();
    });

    it('confirmed with missing targetFiat → success without amount, never falls back to totalFiat', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildSendTxMeta(TransactionType.perpsDeposit, {
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: MUSD_ADDRESS,
            chainId: CHAIN_IDS.MONAD,
            totalFiat: '106',
          },
        } as unknown as Partial<TransactionMeta>),
      );

      expect(sendSuccessFn).toHaveBeenCalledTimes(1);
      expect(sendSuccessFn.mock.calls[0][0].amountFiat).toBeUndefined();
    });

    it.each([
      ['failed', TransactionStatus.failed],
      ['dropped', TransactionStatus.dropped],
      ['cancelled', TransactionStatus.cancelled],
    ])('statusUpdated with %s → send failed toast', (_label, status) => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildSendTxMeta(TransactionType.perpsDeposit, {
          status,
        }),
      });

      expect(sendFailedFn).toHaveBeenCalledTimes(1);
      expect(depositFailedFn).not.toHaveBeenCalled();
      expect(withdrawFailedFn).not.toHaveBeenCalled();
      expect(clearMoneyAccountDepositIntent).not.toHaveBeenCalled();
    });

    it('ignores a perps deposit not funded with mUSD on the Money chain', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildTxMeta({
          id: 'send-tx-other',
          type: TransactionType.perpsDeposit,
          status: TransactionStatus.approved,
          metamaskPay: {
            tokenAddress: MUSD_ADDRESS,
            chainId: '0x1',
            totalFiat: '100',
          },
        } as unknown as Partial<TransactionMeta>),
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(sendInProgressFn).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('perps/predict receive (money withdraw) lifecycle', () => {
    const buildReceiveTxMeta = (
      type: TransactionType,
      overrides: Partial<TransactionMeta> = {},
    ): TransactionMeta =>
      buildTxMeta({
        id: 'receive-tx-1',
        type,
        metamaskPay: {
          tokenAddress: MUSD_ADDRESS,
          chainId: CHAIN_IDS.MONAD,
          isPostQuote: true,
          targetFiat: '50',
        },
        ...overrides,
      } as unknown as Partial<TransactionMeta>);

    it('confirmed → deposit success toast with fiat amount and addMusd intent', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildReceiveTxMeta(TransactionType.perpsWithdraw, {
          status: TransactionStatus.confirmed,
        }),
      );

      expect(depositSuccessFn).toHaveBeenCalledTimes(1);
      const params = depositSuccessFn.mock.calls[0][0];
      expect(params.intent).toBe('addMusd');
      expect(params.amountFiat).toContain('50');
      expect(withdrawSuccessFn).not.toHaveBeenCalled();
      expect(sendSuccessFn).not.toHaveBeenCalled();
    });

    it('confirmed with invalid targetFiat → success without amount', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildReceiveTxMeta(TransactionType.perpsWithdraw, {
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: MUSD_ADDRESS,
            chainId: CHAIN_IDS.MONAD,
            isPostQuote: true,
            targetFiat: 'not-a-number',
          },
        } as unknown as Partial<TransactionMeta>),
      );

      expect(depositSuccessFn).toHaveBeenCalledTimes(1);
      expect(depositSuccessFn.mock.calls[0][0].amountFiat).toBeUndefined();
      expect(depositSuccessFn.mock.calls[0][0].intent).toBe('addMusd');
    });

    it('does not fire in-progress or failed money toasts for a receive (those stay native)', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: buildReceiveTxMeta(TransactionType.perpsWithdraw, {
          status: TransactionStatus.approved,
        }),
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      statusUpdatedHandler({
        transactionMeta: buildReceiveTxMeta(TransactionType.perpsWithdraw, {
          id: 'receive-tx-failed',
          status: TransactionStatus.failed,
        }),
      });

      expect(withdrawInProgressFn).not.toHaveBeenCalled();
      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(sendInProgressFn).not.toHaveBeenCalled();
      expect(withdrawFailedFn).not.toHaveBeenCalled();
      expect(depositFailedFn).not.toHaveBeenCalled();
      expect(sendFailedFn).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('ignores a perps withdraw not landing as mUSD on the Money chain', () => {
      const { confirmedHandler } = renderAndGetHandlers();

      confirmedHandler(
        buildTxMeta({
          id: 'receive-tx-other',
          type: TransactionType.perpsWithdraw,
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: MUSD_ADDRESS,
            chainId: '0x1',
            isPostQuote: true,
            targetFiat: '50',
          },
        } as unknown as Partial<TransactionMeta>),
      );

      expect(depositSuccessFn).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
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

      expect(depositSuccessFn).toHaveBeenCalledWith({
        amountFiat: undefined,
        intent: 'convert',
      });
    });
  });

  describe('deferred in-progress', () => {
    it('does not show in-progress when transaction confirms before the delay elapses', () => {
      const { statusUpdatedHandler, confirmedHandler } = renderAndGetHandlers();

      const tx = buildTxMeta({
        type: TransactionType.moneyAccountDeposit,
        status: TransactionStatus.approved,
        txParams: { from: '0x0', data: encodeDepositData(BigInt(1_000_000)) },
      });
      statusUpdatedHandler({ transactionMeta: tx });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS - 1);
      confirmedHandler({ ...tx, status: TransactionStatus.confirmed });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(depositSuccessFn).toHaveBeenCalledTimes(1);
    });

    it('does not show in-progress when transaction fails before the delay elapses', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      const tx = buildTxMeta({
        type: TransactionType.moneyAccountDeposit,
        status: TransactionStatus.approved,
      });
      statusUpdatedHandler({ transactionMeta: tx });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS - 1);
      statusUpdatedHandler({
        transactionMeta: { ...tx, status: TransactionStatus.failed },
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(depositFailedFn).toHaveBeenCalledTimes(1);
    });

    it('does not show in-progress when transaction drops before the delay elapses', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      const tx = buildTxMeta({
        type: TransactionType.moneyAccountDeposit,
        status: TransactionStatus.approved,
      });
      statusUpdatedHandler({ transactionMeta: tx });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS - 1);
      statusUpdatedHandler({
        transactionMeta: { ...tx, status: TransactionStatus.dropped },
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).not.toHaveBeenCalled();
      expect(depositFailedFn).toHaveBeenCalledTimes(1);
    });

    it('shows in-progress after the delay when no terminal event arrives', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
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
      const statusUpdatedHandler = mockSubscribe.mock.calls.find(
        ([event]) => event === 'TransactionController:transactionStatusUpdated',
      )?.[1] as TransactionStatusUpdatedHandler;

      statusUpdatedHandler({
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
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: batchTxWith(TransactionType.moneyAccountDeposit, {
          status: TransactionStatus.approved,
        }),
      });
      jest.advanceTimersByTime(IN_PROGRESS_DELAY_MS);

      expect(depositInProgressFn).toHaveBeenCalledTimes(1);
      expect(withdrawInProgressFn).not.toHaveBeenCalled();
    });

    it('treats type="batch" with nested moneyAccountWithdraw as a withdraw', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
        transactionMeta: batchTxWith(TransactionType.moneyAccountWithdraw, {
          status: TransactionStatus.failed,
        }),
      });

      expect(withdrawFailedFn).toHaveBeenCalledTimes(1);
      expect(depositFailedFn).not.toHaveBeenCalled();
    });

    it('ignores type="batch" without any Money-Account nested types', () => {
      const { statusUpdatedHandler } = renderAndGetHandlers();

      statusUpdatedHandler({
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
