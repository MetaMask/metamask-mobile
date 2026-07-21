import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useIsPerpsBalanceSelected } from '../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { selectPredictSelectedPaymentToken } from '../../../../UI/Predict/selectors/predictController';
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { usePaySectionSourceMetrics } from './usePaySectionSourceMetrics';

jest.mock('../../../../../selectors/transactionPayController');
jest.mock('../../../../UI/Perps/hooks/useIsPerpsBalanceSelected');
jest.mock('../../../../UI/Predict/selectors/predictController');
jest.mock('./useIsMoneyAccountFlagDefault');
jest.mock('../pay/useTransactionPayData');

const selectPaymentOverrideMock = jest.mocked(
  selectPaymentOverrideByTransactionId,
);
const useIsPerpsBalanceSelectedMock = jest.mocked(useIsPerpsBalanceSelected);
const selectPredictSelectedPaymentTokenMock = jest.mocked(
  selectPredictSelectedPaymentToken,
);
const useIsMoneyAccountFlagDefaultMock = jest.mocked(
  useIsMoneyAccountFlagDefault,
);
const useTransactionPayFiatPaymentMock = jest.mocked(
  useTransactionPayFiatPayment,
);

function runHook({
  type,
  hasPayToken = true,
}: { type?: TransactionType; hasPayToken?: boolean } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  state.engine.backgroundState.TransactionController.transactions[0].type =
    type ?? TransactionType.perpsDeposit;

  return renderHookWithProvider(() => usePaySectionSourceMetrics(hasPayToken), {
    state,
  });
}

describe('usePaySectionSourceMetrics', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    selectPaymentOverrideMock.mockReturnValue(undefined);
    useIsPerpsBalanceSelectedMock.mockReturnValue(false);
    selectPredictSelectedPaymentTokenMock.mockReturnValue({
      address: '0x123',
      chainId: '0x1',
    });
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(false);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
  });

  it('defaults to crypto', () => {
    const { result } = runHook();

    expect(result.current).toEqual({
      presented: 'crypto',
      selected: 'crypto',
      switchCount: 0,
    });
  });

  it('returns money-account when payment override is MoneyAccount', () => {
    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);

    const { result } = runHook();

    expect(result.current.selected).toBe('money-account');
    expect(result.current.presented).toBe('money-account');
  });

  it('returns money-account when isDefaultMoneyAccount flag is true', () => {
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(true);

    const { result } = runHook();

    expect(result.current.selected).toBe('money-account');
  });

  it('returns perps when perps balance selected for perpsDepositAndOrder', () => {
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);

    const { result } = runHook({
      type: TransactionType.perpsDepositAndOrder,
    });

    expect(result.current.selected).toBe('perps');
  });

  it('returns crypto when perps balance selected but not perpsDepositAndOrder', () => {
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);

    const { result } = runHook({ type: TransactionType.perpsDeposit });

    expect(result.current.selected).toBe('crypto');
  });

  it('returns predict when predict balance selected for predictDepositAndOrder', () => {
    selectPredictSelectedPaymentTokenMock.mockReturnValue(null);

    const { result } = runHook({
      type: TransactionType.predictDepositAndOrder,
    });

    expect(result.current.selected).toBe('predict');
  });

  it('returns bank-card when fiat payment is selected', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm_123',
    } as never);

    const { result } = runHook();

    expect(result.current.selected).toBe('bank-card');
  });

  it('money-account takes priority over perps and predict', () => {
    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);
    selectPredictSelectedPaymentTokenMock.mockReturnValue(null);

    const { result } = runHook({
      type: TransactionType.perpsDepositAndOrder,
    });

    expect(result.current.selected).toBe('money-account');
  });

  it('returns null presented when hasPayToken is false', () => {
    const { result } = runHook({ hasPayToken: false });

    expect(result.current.presented).toBeNull();
    expect(result.current.switchCount).toBe(0);
  });

  it('captures presented on first render and preserves it', () => {
    const { result, rerender } = runHook();

    expect(result.current.presented).toBe('crypto');

    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
    rerender({});

    expect(result.current.presented).toBe('crypto');
    expect(result.current.selected).toBe('money-account');
  });

  it('increments switchCount on section change', () => {
    const { result, rerender } = runHook();

    expect(result.current.switchCount).toBe(0);

    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
    rerender({});

    expect(result.current.switchCount).toBe(1);

    selectPaymentOverrideMock.mockReturnValue(undefined);
    rerender({});

    expect(result.current.switchCount).toBe(2);
  });

  it('does not increment switchCount when section stays the same', () => {
    const { result, rerender } = runHook();

    rerender({});
    rerender({});

    expect(result.current.switchCount).toBe(0);
  });
});
