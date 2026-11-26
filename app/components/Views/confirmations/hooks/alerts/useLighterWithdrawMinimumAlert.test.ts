import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useLighterWithdrawMinimumAlert } from './useLighterWithdrawMinimumAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../context/confirmation-context');

function runHook({
  pendingAmount,
  contextPendingFiatAmount,
}: { pendingAmount?: string; contextPendingFiatAmount?: string } = {}) {
  jest.mocked(useConfirmationContext).mockReturnValue({
    pendingFiatAmount: contextPendingFiatAmount,
  } as unknown as ReturnType<typeof useConfirmationContext>);

  return renderHookWithProvider(() =>
    useLighterWithdrawMinimumAlert({ pendingAmount }),
  );
}

describe('useLighterWithdrawMinimumAlert', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.perpsLighterWithdraw,
    } as unknown as TransactionMeta);
  });

  it('returns the fiat buy amount limit alert when the amount is below 2 USD', () => {
    const { result } = runHook({ pendingAmount: '1.99' });

    expect(result.current).toEqual([
      {
        key: AlertKeys.FiatBuyAmountLimit,
        field: RowAlertKey.Amount,
        title: strings('alert_system.fiat_buy_amount_limit.title'),
        message: 'Minimum withdrawal is $2.00',
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert when the amount equals the minimum', () => {
    const { result } = runHook({ pendingAmount: '2' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when the amount is above the minimum', () => {
    const { result } = runHook({ pendingAmount: '25' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when the amount is zero', () => {
    const { result } = runHook({ pendingAmount: '0' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when no amount is available', () => {
    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when the amount is not a number', () => {
    const { result } = runHook({ pendingAmount: 'abc' });

    expect(result.current).toStrictEqual([]);
  });

  it('falls back to the pending keypad amount from confirmation context', () => {
    const { result } = runHook({ contextPendingFiatAmount: '1.99' });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.FiatBuyAmountLimit);
  });

  it('prefers an explicit pendingAmount over the context amount', () => {
    const { result } = runHook({
      pendingAmount: '5',
      contextPendingFiatAmount: '1.5',
    });

    expect(result.current).toStrictEqual([]);
  });

  it.each([
    TransactionType.perpsWithdraw,
    TransactionType.perpsLighterDeposit,
    TransactionType.simpleSend,
  ])('returns no alert for transaction type %s', (type) => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type,
    } as unknown as TransactionMeta);

    const { result } = runHook({ pendingAmount: '0.5' });

    expect(result.current).toStrictEqual([]);
  });
});
