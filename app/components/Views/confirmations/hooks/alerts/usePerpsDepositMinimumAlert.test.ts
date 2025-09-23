import { renderHook } from '@testing-library/react-native';
import { usePerpsDepositMinimumAlert } from './usePerpsDepositMinimumAlert';
import { useTokenAmount } from '../useTokenAmount';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

jest.mock('../useTokenAmount');
jest.mock('../transactions/useTransactionMetadataRequest');

function runHook() {
  return renderHook(() => usePerpsDepositMinimumAlert());
}

describe('usePerpsDepositMinimumAlert', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const useTokenAmountMock = jest.mocked(useTokenAmount);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as TransactionMeta);
  });

  it('returns alert if token amount less than minimum', () => {
    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '9.99',
    } as ReturnType<typeof useTokenAmount>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([
      {
        key: AlertKeys.PerpsDepositMinimum,
        field: RowAlertKey.Amount,
        message: strings('alert_system.perps_deposit_minimum.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert if token amount greater than minimum', () => {
    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '10.01',
    } as ReturnType<typeof useTokenAmount>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert if type not perps deposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.contractInteraction,
    } as TransactionMeta);

    useTokenAmountMock.mockReturnValue({
      amountUnformatted: '9.99',
    } as ReturnType<typeof useTokenAmount>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
