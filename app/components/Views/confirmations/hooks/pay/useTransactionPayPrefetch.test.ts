import { merge } from 'lodash';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionPayPrefetch } from './useTransactionPayPrefetch';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { selectMoneyAccountDepositQuotePipelineEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import { getMoneyAccountDepositIntent } from '../../../../UI/Money/utils/moneyAccountDepositIntent';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyAccountDepositQuotePipelineEnabled: jest.fn(),
  }),
);
jest.mock('../../../../UI/Money/utils/moneyAccountDepositIntent');
jest.mock('./useTransactionPayData');

const DEPOSIT_META = { type: TransactionType.moneyAccountDeposit };

function runHook({
  transactionMeta,
}: { transactionMeta?: Partial<TransactionMeta> } = {}) {
  return renderHookWithProvider(useTransactionPayPrefetch, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      transactionMeta
        ? {
            engine: {
              backgroundState: {
                TransactionController: { transactions: [transactionMeta] },
              },
            },
          }
        : {},
    ),
  });
}

describe('useTransactionPayPrefetch', () => {
  const selectMoneyAccountDepositQuotePipelineEnabledMock = jest.mocked(
    selectMoneyAccountDepositQuotePipelineEnabled,
  );
  const getMoneyAccountDepositIntentMock = jest.mocked(
    getMoneyAccountDepositIntent,
  );
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    selectMoneyAccountDepositQuotePipelineEnabledMock.mockReturnValue(false);
    getMoneyAccountDepositIntentMock.mockReturnValue(undefined);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
  });

  it('is enabled for a generic crypto deposit when the flag is enabled', () => {
    selectMoneyAccountDepositQuotePipelineEnabledMock.mockReturnValue(true);

    const { result } = runHook({ transactionMeta: DEPOSIT_META });

    expect(result.current.enabled).toBe(true);
  });

  it('is enabled for an explicit convert intent', () => {
    selectMoneyAccountDepositQuotePipelineEnabledMock.mockReturnValue(true);
    getMoneyAccountDepositIntentMock.mockReturnValue('convert');

    const { result } = runHook({ transactionMeta: DEPOSIT_META });

    expect(result.current.enabled).toBe(true);
  });

  it.each(['addMusd', 'card'] as const)(
    'is disabled for the %s intent',
    (depositIntent) => {
      selectMoneyAccountDepositQuotePipelineEnabledMock.mockReturnValue(true);
      getMoneyAccountDepositIntentMock.mockReturnValue(depositIntent);

      const { result } = runHook({ transactionMeta: DEPOSIT_META });

      expect(result.current.enabled).toBe(false);
    },
  );

  it('is disabled when a fiat payment method is selected', () => {
    selectMoneyAccountDepositQuotePipelineEnabledMock.mockReturnValue(true);
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'credit-debit-card',
    });

    const { result } = runHook({ transactionMeta: DEPOSIT_META });

    expect(result.current.enabled).toBe(false);
  });

  it('is disabled when the flag is disabled', () => {
    const { result } = runHook({ transactionMeta: DEPOSIT_META });

    expect(result.current.enabled).toBe(false);
  });

  it('is disabled for transaction types other than deposit', () => {
    selectMoneyAccountDepositQuotePipelineEnabledMock.mockReturnValue(true);

    const { result } = runHook({
      transactionMeta: { type: TransactionType.moneyAccountWithdraw },
    });

    expect(result.current.enabled).toBe(false);
  });
});
