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
import { selectTransactionState } from '../../../../../reducers/transaction';
import { useConfirmActions } from '../useConfirmActions';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { noop } from 'lodash';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    params: {
      maxValueMode: false,
    },
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((selector) => selector()),
}));
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});
jest.mock('../useConfirmActions');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayToken');
jest.mock('../useAccountNativeBalance');
jest.mock('../../../../../../locales/i18n');
jest.mock('../../../../../selectors/networkController');
jest.mock('../../../../../reducers/transaction', () => ({
  selectTransactionState: jest.fn(),
}));

describe('useInsufficientBalanceAlert', () => {
  const mockSelectTransactionState = jest.mocked(selectTransactionState);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseAccountNativeBalance = jest.mocked(useAccountNativeBalance);
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockSelectNetworkConfigurations = jest.mocked(
    selectNetworkConfigurations,
  );
  const mockUseTransactionPayToken = jest.mocked(useTransactionPayToken);

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
    mockUseTransactionPayToken.mockReturnValue({
      payToken: undefined,
      setPayToken: noop,
    });

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
    mockSelectTransactionState.mockReturnValue({
      maxValueMode: false,
    });
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });
  });

  it('return empty array when no transaction metadata is available', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHook(() => useInsufficientBalanceAlert());
    expect(result.current).toEqual([]);
  });

  it('return empty array when max value mode is enabled', () => {
    mockSelectTransactionState.mockReturnValue({
      maxValueMode: true,
    });

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

  it('onReject is called when callback is called', () => {
    const onRejectMock = jest.fn();
    mockUseConfirmActions.mockReturnValue({
      onReject: onRejectMock,
      onConfirm: jest.fn(),
    });
    const { result } = renderHook(() => useInsufficientBalanceAlert());

    const callback = result?.current[0]?.action?.callback;
    callback?.();
    expect(onRejectMock).toHaveBeenCalled();
    expect(onRejectMock).toHaveBeenCalledWith(undefined, true);
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

  it('returns empty array if pay token selected', () => {
    mockUseTransactionPayToken.mockReturnValue({
      setPayToken: noop,
      payToken: {} as never,
    });

    const { result } = renderHook(() => useInsufficientBalanceAlert());

    expect(result.current).toStrictEqual([]);
  });

  describe('when ignoreGasFeeToken is true', () => {
    it('returns empty array', () => {
      mockSelectTransactionState.mockReturnValue({
        maxValueMode: true,
      });
      const { result } = renderHook(() =>
        useInsufficientBalanceAlert({ ignoreGasFeeToken: true }),
      );
      expect(result.current).toEqual([]);
    });

    it('returns alert when balance is insufficient', () => {
      const { result } = renderHook(() =>
        useInsufficientBalanceAlert({ ignoreGasFeeToken: true }),
      );

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
  });
});
