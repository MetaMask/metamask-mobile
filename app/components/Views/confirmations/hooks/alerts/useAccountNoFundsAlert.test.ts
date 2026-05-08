import { renderHook } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayAvailableTokens } from '../pay/useTransactionPayAvailableTokens';
import { useAccountNoFundsAlert } from './useAccountNoFundsAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayAvailableTokens');

function runHook() {
  return renderHook(() => useAccountNoFundsAlert());
}

describe('useAccountNoFundsAlert', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0xabc' },
    } as TransactionMeta);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: true,
    });
  });

  it('returns alert for moneyAccountDeposit with no available tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    const { result } = runHook();

    expect(result.current).toStrictEqual([
      {
        key: AlertKeys.AccountNoFunds,
        title: strings('alert_system.account_no_funds.message'),
        message: strings('alert_system.account_no_funds.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert for moneyAccountDeposit with available tokens', () => {
    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert for non-moneyAccountDeposit transaction', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.contractInteraction,
      txParams: { from: '0xabc' },
    } as TransactionMeta);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when transaction metadata is undefined', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
