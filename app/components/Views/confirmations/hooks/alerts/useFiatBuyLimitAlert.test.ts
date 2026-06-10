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

const NATIVE_PROVIDER_ID = '/providers/transak-native';

function makeStoreState(selectedProviderId: string | null = null) {
  return {
    engine: {
      backgroundState: {
        RampsController: {
          providers: {
            data: [],
            selected: selectedProviderId
              ? { id: selectedProviderId, type: 'native' }
              : null,
            isLoading: false,
            error: null,
          },
        },
      },
    },
  };
}

function runHook({
  pendingAmount,
  selectedProviderId = null,
}: { pendingAmount?: string; selectedProviderId?: string | null } = {}) {
  return renderHookWithProvider(
    () => useFiatBuyLimitAlert({ pendingAmount }),
    { state: makeStoreState(selectedProviderId) },
  );
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

  it('returns blocking alert when transaction type is fiat-enabled and amountLimitError is present', () => {
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

  describe('provider resolution', () => {
    it('uses selectedProvider from Redux when no quote exists yet (pre-quote)', () => {
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-card',
        amountFiat: '100',
        rampsQuote: null,
      });
      useRampsBuyLimitsMock.mockReturnValue({
        amountLimitError: null,
        currency: 'USD',
      });

      runHook({ pendingAmount: '100', selectedProviderId: NATIVE_PROVIDER_ID });

      expect(useRampsBuyLimitsMock).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: NATIVE_PROVIDER_ID }),
      );
    });

    it('prefers rampsQuote.provider over selectedProvider when a quote exists', () => {
      const QUOTE_PROVIDER_ID = '/providers/other-native';
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-card',
        amountFiat: '100',
        rampsQuote: { provider: QUOTE_PROVIDER_ID },
      });
      useRampsBuyLimitsMock.mockReturnValue({
        amountLimitError: null,
        currency: 'USD',
      });

      runHook({ pendingAmount: '100', selectedProviderId: NATIVE_PROVIDER_ID });

      expect(useRampsBuyLimitsMock).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: QUOTE_PROVIDER_ID }),
      );
    });
  });
});
