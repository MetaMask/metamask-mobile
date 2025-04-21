import { renderHook } from '@testing-library/react-hooks';
import { TransactionMeta } from '@metamask/transaction-controller';
import { useInsufficientBalanceAlert } from './useInsufficientBalanceAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useAccountNativeBalance } from '../useAccountNativeBalance';
import { strings } from '../../../../../../locales/i18n';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((selector) => selector()),
}));
jest.mock('@react-navigation/native');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useAccountNativeBalance');
jest.mock('../../../../../../locales/i18n');
jest.mock('../../../../../selectors/networkController');

describe('useInsufficientBalanceAlert', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseAccountNativeBalance = jest.mocked(useAccountNativeBalance);
  const mockSelectNetworkConfigurations = jest.mocked(
    selectNetworkConfigurations,
  );
  const mockChainId = '0x1';
  const mockFromAddress = '0x123';
  const mockNativeCurrency = 'ETH';
  const mockTransaction = {
    chainId: mockChainId,
    txParams: {
      from: mockFromAddress,
      value: '0x5',
      gas: '0x2',
      maxFeePerGas: '0x3',
    },
  } as unknown as TransactionMeta;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0x8', // 8 wei
    } as unknown as ReturnType<typeof useAccountNativeBalance>);
    mockUseTransactionMetadataRequest.mockReturnValue(mockTransaction);
    mockSelectNetworkConfigurations.mockReturnValue({
      [mockChainId]: {
        nativeCurrency: mockNativeCurrency,
      },
    } as unknown as ReturnType<typeof selectNetworkConfigurations>);

    (strings as jest.Mock).mockImplementation((key, params) => {
      if (key === 'alert_system.insufficient_balance.buy_action') {
        return `Buy ${params.nativeCurrency}`;
      }
      if (key === 'alert_system.insufficient_balance.message') {
        return `Insufficient ${params.nativeCurrency} balance`;
      }
      if (key === 'alert_system.insufficient_balance.title') {
        return 'Insufficient Balance';
      }
      return key;
    });
  });

  it('return empty array when no transaction metadata is available', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHook(() => useInsufficientBalanceAlert());
    expect(result.current).toEqual([]);
  });

  it('return alert when balance is insufficient (with maxFeePerGas)', () => {
    // Transaction needs: value (5) + (maxFeePerGas (3) * gas (2)) = 11 wei
    // Balance is only 8 wei, so should show alert
    const { result } = renderHook(() => useInsufficientBalanceAlert());

    expect(result.current).toEqual([
      {
        action: {
          label: `Buy ${mockNativeCurrency}`,
          callback: expect.any(Function),
        },
        isBlocking: true,
        field: RowAlertKey.EstimatedFee,
        key: AlertKeys.InsufficientBalance,
        message: `Insufficient ${mockNativeCurrency} balance`,
        title: 'Insufficient Balance',
        severity: Severity.Danger,
        skipConfirmation: true,
      },
    ]);
  });

  it('return alert when balance is insufficient (with gasPrice)', () => {
    const txWithGasPrice = {
      ...mockTransaction,
      txParams: {
        ...mockTransaction.txParams,
        maxFeePerGas: undefined,
        gasPrice: '0x3', // 3 wei per gas
      },
    };
    mockUseTransactionMetadataRequest.mockReturnValue(txWithGasPrice);

    const { result } = renderHook(() => useInsufficientBalanceAlert());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.InsufficientBalance);
  });

  it('return empty array when balance is sufficient for value and gas', () => {
    // Transaction needs: value (5) + (maxFeePerGas (3) * gas (2)) = 11 wei
    // Balance is 12 wei, no alert
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xC',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useInsufficientBalanceAlert());
    expect(result.current).toEqual([]);
  });

  it('handle transaction with no value but with gas fees', () => {
    const txWithNoValue = {
      ...mockTransaction,
      txParams: {
        ...mockTransaction.txParams,
        value: '0x0',
      },
    };
    mockUseTransactionMetadataRequest.mockReturnValue(txWithNoValue);
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0x5',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useInsufficientBalanceAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.InsufficientBalance);
  });
});
