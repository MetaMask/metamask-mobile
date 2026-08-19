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
import { useIsFiatPaymentAvailable } from '../pay/useIsFiatPaymentAvailable';
import { useIsTransactionPayLoading } from '../pay/useTransactionPayData';
import { useAccountNoFundsAlert } from './useAccountNoFundsAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayAvailableTokens');
jest.mock('../pay/useIsFiatPaymentAvailable');
jest.mock('../pay/useTransactionPayData', () => ({
  ...jest.requireActual('../pay/useTransactionPayData'),
  useIsTransactionPayLoading: jest.fn(),
}));

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

  const useIsFiatPaymentAvailableMock = jest.mocked(useIsFiatPaymentAvailable);

  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
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

    useIsFiatPaymentAvailableMock.mockReturnValue(false);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
  });

  it('returns alert for moneyAccountDeposit with no available tokens and no fiat', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    const { result } = runHook();

    expect(result.current).toStrictEqual([
      {
        key: AlertKeys.AccountNoFunds,
        title: strings('alert_system.account_no_funds.title'),
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

  it('returns no alert for moneyAccountDeposit when fiat payment is available', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    useIsFiatPaymentAvailableMock.mockReturnValue(true);

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

  it('returns no alert when transaction pay is still loading', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
