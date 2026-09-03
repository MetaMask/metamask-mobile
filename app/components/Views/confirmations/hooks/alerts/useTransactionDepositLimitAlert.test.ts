import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionDepositLimitAlert } from './useTransactionDepositLimitAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { selectDepositLimits } from '../../../../../selectors/featureFlagController/confirmations';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/confirmations',
    ),
    selectDepositLimits: jest.fn(),
  }),
);

function runHook({ pendingAmount }: { pendingAmount?: string } = {}) {
  return renderHookWithProvider(() =>
    useTransactionDepositLimitAlert({ pendingAmount }),
  );
}

describe('useTransactionDepositLimitAlert', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.moneyAccountDeposit,
    } as unknown as TransactionMeta);

    (selectDepositLimits as unknown as jest.Mock).mockReturnValue({
      moneyAccountDeposit: 100000,
    });
  });

  it('returns alert when pending amount exceeds deposit limit', () => {
    const { result } = runHook({ pendingAmount: '150000' });
    const expectedTitle = strings('alert_system.deposit_limit.title', {
      amount: '$100,000',
    });

    expect(result.current).toEqual([
      {
        key: AlertKeys.DepositLimit,
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

  it('returns no alert when deposit limits map is empty', () => {
    (selectDepositLimits as unknown as jest.Mock).mockReturnValue({});

    const { result } = runHook({ pendingAmount: '150000' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when transaction type has no configured deposit limit', () => {
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
    (selectDepositLimits as unknown as jest.Mock).mockReturnValue({
      moneyAccountDeposit: 50000,
    });

    const { result } = runHook({ pendingAmount: '60000' });
    const expectedTitle = strings('alert_system.deposit_limit.title', {
      amount: '$50,000',
    });

    expect(result.current).toEqual([
      {
        key: AlertKeys.DepositLimit,
        field: RowAlertKey.Amount,
        title: expectedTitle,
        message: expectedTitle,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('matches any deposit type from the feature flag map', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.perpsDeposit,
    } as unknown as TransactionMeta);

    (selectDepositLimits as unknown as jest.Mock).mockReturnValue({
      moneyAccountDeposit: 100000,
      perpsDeposit: 25000,
    });

    const { result } = runHook({ pendingAmount: '30000' });
    const expectedTitle = strings('alert_system.deposit_limit.title', {
      amount: '$25,000',
    });

    expect(result.current).toEqual([
      {
        key: AlertKeys.DepositLimit,
        field: RowAlertKey.Amount,
        title: expectedTitle,
        message: expectedTitle,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });
});
