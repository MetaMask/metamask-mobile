import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountDepositLimitAlert } from './useMoneyAccountDepositLimitAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { selectDepositLimit } from '../../../../../selectors/featureFlagController/confirmations';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/confirmations',
    ),
    selectDepositLimit: jest.fn(),
  }),
);

function runHook({ pendingAmount }: { pendingAmount?: string } = {}) {
  return renderHookWithProvider(() =>
    useMoneyAccountDepositLimitAlert({ pendingAmount }),
  );
}

describe('useMoneyAccountDepositLimitAlert', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.moneyAccountDeposit,
    } as unknown as TransactionMeta);

    (selectDepositLimit as unknown as jest.Mock).mockReturnValue(100000);
  });

  it('returns alert when pending amount exceeds deposit limit', () => {
    const { result } = runHook({ pendingAmount: '150000' });
    const expectedTitle = strings(
      'alert_system.money_account_deposit_limit.title',
      { amount: '$100,000' },
    );

    expect(result.current).toEqual([
      {
        key: AlertKeys.MoneyAccountDepositLimit,
        field: RowAlertKey.Amount,
        title: expectedTitle,
        message: expectedTitle,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert when pending amount equals deposit limit', () => {
    const { result } = runHook({ pendingAmount: '100000' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when pending amount is less than deposit limit', () => {
    const { result } = runHook({ pendingAmount: '50000' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when deposit limit is undefined', () => {
    (selectDepositLimit as unknown as jest.Mock).mockReturnValue(undefined);

    const { result } = runHook({ pendingAmount: '150000' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when transaction type is not moneyAccountDeposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.simpleSend,
    } as unknown as TransactionMeta);

    const { result } = runHook({ pendingAmount: '150000' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when no pendingAmount is provided', () => {
    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('uses custom limit from feature flag', () => {
    (selectDepositLimit as unknown as jest.Mock).mockReturnValue(50000);

    const { result } = runHook({ pendingAmount: '60000' });
    const expectedTitle = strings(
      'alert_system.money_account_deposit_limit.title',
      { amount: '$50,000' },
    );

    expect(result.current).toEqual([
      {
        key: AlertKeys.MoneyAccountDepositLimit,
        field: RowAlertKey.Amount,
        title: expectedTitle,
        message: expectedTitle,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });
});
