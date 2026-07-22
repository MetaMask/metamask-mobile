import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useDefaultPaySelectedSection } from './useDefaultPaySelectedSection';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';
import { PayWithOption } from '../../components/confirm/confirm-component';

const TRANSACTION_ID = 'tx-perps-1';
const MONEY_ACCOUNT_ADDRESS = '0xabc1111111111111111111111111111111111111';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionPayController: {
        setTransactionConfig: jest.fn(),
        updateFiatPayment: jest.fn(),
      },
    },
  },
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('./useIsMoneyAccountFlagDefault', () => ({
  useIsMoneyAccountFlagDefault: jest.fn(),
}));

const setTransactionConfigMock = jest.mocked(
  Engine.context.TransactionPayController.setTransactionConfig,
);
const updateFiatPaymentMock = jest.mocked(
  Engine.context.TransactionPayController.updateFiatPayment,
);

const render = () =>
  renderHookWithProvider(() => useDefaultPaySelectedSection());

describe('useDefaultPaySelectedSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    });
    (useIsMoneyAccountFlagDefault as jest.Mock).mockReturnValue(false);
    (useParams as jest.Mock).mockReturnValue({});
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue(undefined);
  });

  it('does nothing when payWithOption is not set and flag is not set', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
    });

    render();

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('does nothing when no transaction exists', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });

    render();

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('sets PaymentOverride.MoneyAccount and refundTo for moneyAccountDeposit', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.moneyAccountDeposit,
    });

    render();

    expect(setTransactionConfigMock).toHaveBeenCalledWith(
      TRANSACTION_ID,
      expect.any(Function),
    );

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config: Record<string, unknown> = {};
    callback(config as never);

    expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
    expect(config.refundTo).toBe(MONEY_ACCOUNT_ADDRESS);
    expect(config.atomic).toBeUndefined();
    expect(config.recipient).toBeUndefined();
  });

  it('clears selectedPaymentMethodId via updateFiatPayment', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.moneyAccountDeposit,
    });

    render();

    expect(updateFiatPaymentMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID,
      callback: expect.any(Function),
    });

    const fiatPayment = { selectedPaymentMethodId: 'some-method' } as Record<
      string,
      unknown
    >;
    updateFiatPaymentMock.mock.calls[0][0].callback(fiatPayment as never);

    expect(fiatPayment.selectedPaymentMethodId).toBeUndefined();
  });

  it('sets atomic:false and recipient for perpsWithdraw', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.perpsWithdraw,
    });

    render();

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config: Record<string, unknown> = {};
    callback(config as never);

    expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
    expect(config.atomic).toBe(false);
    expect(config.recipient).toBe(MONEY_ACCOUNT_ADDRESS);
    expect(config.refundTo).toBeUndefined();
  });

  it('sets atomic:false and recipient for predictWithdraw', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.predictWithdraw,
    });

    render();

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config: Record<string, unknown> = {};
    callback(config as never);

    expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
    expect(config.atomic).toBe(false);
    expect(config.recipient).toBe(MONEY_ACCOUNT_ADDRESS);
    expect(config.refundTo).toBeUndefined();
  });

  it('sets only paymentOverride for moneyAccountWithdraw (no atomic, recipient, refundTo)', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.moneyAccountWithdraw,
    });

    render();

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config: Record<string, unknown> = {};
    callback(config as never);

    expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
    expect(config.atomic).toBeUndefined();
    expect(config.recipient).toBeUndefined();
    expect(config.refundTo).toBeUndefined();
  });

  it('only applies override once per transaction', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
    });

    const { rerender } = render();
    rerender({});

    expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);
  });

  it('omits refundTo when money account has no address for moneyAccountDeposit', () => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.moneyAccountDeposit,
    });

    render();

    const callback = setTransactionConfigMock.mock.calls[0][1];
    const config: Record<string, unknown> = {};
    callback(config as never);

    expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
    expect(config.refundTo).toBeUndefined();
  });

  describe('defaultPaySelectedSection flag', () => {
    it('sets refundTo for moneyAccountDeposit when flag is active', () => {
      (useIsMoneyAccountFlagDefault as jest.Mock).mockReturnValue(true);
      (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
        id: TRANSACTION_ID,
        type: TransactionType.moneyAccountDeposit,
      });

      render();

      expect(setTransactionConfigMock).toHaveBeenCalledWith(
        TRANSACTION_ID,
        expect.any(Function),
      );

      const callback = setTransactionConfigMock.mock.calls[0][1];
      const config: Record<string, unknown> = {};
      callback(config as never);

      expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
      expect(config.refundTo).toBe(MONEY_ACCOUNT_ADDRESS);
    });

    it('sets atomic:false and recipient for predictWithdraw when flag is active', () => {
      (useIsMoneyAccountFlagDefault as jest.Mock).mockReturnValue(true);
      (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
        id: TRANSACTION_ID,
        type: TransactionType.predictWithdraw,
      });

      render();

      const callback = setTransactionConfigMock.mock.calls[0][1];
      const config: Record<string, unknown> = {};
      callback(config as never);

      expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
      expect(config.atomic).toBe(false);
      expect(config.recipient).toBe(MONEY_ACCOUNT_ADDRESS);
      expect(config.refundTo).toBeUndefined();
    });

    it('clears selectedPaymentMethodId via updateFiatPayment when flag is active', () => {
      (useIsMoneyAccountFlagDefault as jest.Mock).mockReturnValue(true);
      (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
        id: TRANSACTION_ID,
        type: TransactionType.predictWithdraw,
      });

      render();

      expect(updateFiatPaymentMock).toHaveBeenCalledWith({
        transactionId: TRANSACTION_ID,
        callback: expect.any(Function),
      });

      const fiatPayment = {
        selectedPaymentMethodId: 'existing-method',
      } as Record<string, unknown>;
      updateFiatPaymentMock.mock.calls[0][0].callback(fiatPayment as never);

      expect(fiatPayment.selectedPaymentMethodId).toBeUndefined();
    });

    it('does not set override when useIsMoneyAccountFlagDefault returns false', () => {
      (useIsMoneyAccountFlagDefault as jest.Mock).mockReturnValue(false);
      (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
        id: TRANSACTION_ID,
      });

      render();

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
      expect(updateFiatPaymentMock).not.toHaveBeenCalled();
    });
  });
});
