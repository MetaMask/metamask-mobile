import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { useFiatBuyLimitAlert } from './useFiatBuyLimitAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { useRampsBuyLimits } from '../../../../UI/Ramp/hooks/useRampsBuyLimits';
import { useMMPayFiatConfig } from '../pay/useMMPayFiatConfig';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayData');
jest.mock('../../../../UI/Ramp/hooks/useRampsBuyLimits');
jest.mock('../pay/useMMPayFiatConfig');

function runHook({ pendingAmount }: { pendingAmount?: string } = {}) {
  return renderHookWithProvider(() => useFiatBuyLimitAlert({ pendingAmount }), {
    state: {},
  });
}

describe('useFiatBuyLimitAlert', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useRampsBuyLimitsMock = jest.mocked(useRampsBuyLimits);
  const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);

  beforeEach(() => {
    jest.resetAllMocks();

    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
    } as unknown as ReturnType<typeof useMMPayFiatConfig>);

    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.moneyAccountDeposit,
    } as unknown as TransactionMeta);

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
      amountFiat: '100',
    });

    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: null,
      currency: 'USD',
    });
  });

  it('returns blocking alert when the amount is outside the provider limits', () => {
    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: 'Amount exceeds maximum limit of $500',
      currency: 'USD',
    });

    const { result } = runHook({ pendingAmount: '600' });

    expect(result.current).toEqual([
      {
        key: AlertKeys.FiatBuyAmountLimit,
        field: RowAlertKey.Amount,
        title: 'Amount out of range',
        message: 'Amount exceeds maximum limit of $500',
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns empty array when amountLimitError is null', () => {
    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: null,
      currency: 'USD',
    });

    const { result } = runHook({ pendingAmount: '100' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns empty array when transaction type is not in enabledTransactionTypes', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.simpleSend,
    } as unknown as TransactionMeta);

    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: 'Amount exceeds maximum limit of $500',
      currency: 'USD',
    });

    const { result } = runHook({ pendingAmount: '600' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns empty array when no payment method id is present', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      amountFiat: '100',
    });

    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: 'Amount exceeds maximum limit of $500',
      currency: 'USD',
    });

    const { result } = runHook({ pendingAmount: '600' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns empty array when fiatPayment is undefined', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);

    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: 'Amount exceeds maximum limit of $500',
      currency: 'USD',
    });

    const { result } = runHook({ pendingAmount: '600' });

    expect(result.current).toStrictEqual([]);
  });

  it('uses pendingAmount over fiatPayment amountFiat', () => {
    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: null,
      currency: 'USD',
    });

    runHook({ pendingAmount: '250' });

    expect(useRampsBuyLimitsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 250,
      }),
    );
  });

  it('falls back to fiatPayment amountFiat when no pendingAmount provided', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
      amountFiat: '150',
    });
    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: null,
      currency: 'USD',
    });

    runHook();

    expect(useRampsBuyLimitsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 150,
      }),
    );
  });

  it('does not affect flows not in enabledTransactionTypes (e.g. withdraw)', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.moneyAccountWithdraw,
    } as unknown as TransactionMeta);

    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: 'Some limit error',
      currency: 'USD',
    });

    const { result } = runHook({ pendingAmount: '600' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns empty array when selectedPaymentMethodId is cleared for money account', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: undefined,
      amountFiat: '0.05',
    });

    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: 'Minimum purchase is $5.00',
      currency: 'USD',
    });

    const { result } = runHook({ pendingAmount: '0.05' });

    expect(result.current).toStrictEqual([]);
  });
});
