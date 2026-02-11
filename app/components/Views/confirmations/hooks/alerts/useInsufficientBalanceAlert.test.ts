import { renderHook } from '@testing-library/react-hooks';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useInsufficientBalanceAlert } from './useInsufficientBalanceAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useAccountNativeBalance } from '../useAccountNativeBalance';
import { strings } from '../../../../../../locales/i18n';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { useConfirmActions } from '../useConfirmActions';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import { useHasInsufficientBalance } from '../useHasInsufficientBalance';
import { selectUseTransactionSimulations } from '../../../../../selectors/preferencesController';
import { Hex } from '@metamask/utils';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
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

jest.mock('../../../../../selectors/preferencesController');
jest.mock('../useHasInsufficientBalance');
jest.mock('../useConfirmActions');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useAccountNativeBalance');
jest.mock('../../../../../../locales/i18n');
jest.mock('../../../../../selectors/networkController');
jest.mock('../../context/confirmation-context');
jest.mock('../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));
jest.mock('../gas/useIsGaslessSupported');
jest.mock('../pay/useTransactionPayHasSourceAmount');

describe('useInsufficientBalanceAlert', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseAccountNativeBalance = jest.mocked(useAccountNativeBalance);
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockSelectUseTransactionSimulations = jest.mocked(
    selectUseTransactionSimulations,
  );
  const mockUseConfirmationContext = jest.mocked(useConfirmationContext);
  const mockUseRampNavigation = jest.mocked(useRampNavigation);
  const mockGoToBuy = jest.fn();
  const useIsGaslessSupportedMock = jest.mocked(useIsGaslessSupported);
  const useTransactionPayHasSourceAmountMock = jest.mocked(
    useTransactionPayHasSourceAmount,
  );
  const useHasInsufficientBalanceMock = jest.mocked(useHasInsufficientBalance);

  const mockChainId = '0x1' as Hex;
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

    useIsGaslessSupportedMock.mockReturnValue({
      isSmartTransaction: false,
      isSupported: false,
      pending: false,
    });
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0x8', // 8 wei
    } as unknown as ReturnType<typeof useAccountNativeBalance>);
    mockUseTransactionMetadataRequest.mockReturnValue(mockTransaction);
    mockSelectUseTransactionSimulations.mockReturnValue(false);

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
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });
    mockUseConfirmationContext.mockReturnValue({
      isTransactionValueUpdating: false,
    } as unknown as ReturnType<typeof useConfirmationContext>);
    mockUseRampNavigation.mockReturnValue({
      goToBuy: mockGoToBuy,
      goToAggregator: jest.fn(),
      goToSell: jest.fn(),
      goToDeposit: jest.fn(),
    });

    useTransactionPayHasSourceAmountMock.mockReturnValue(false);

    useHasInsufficientBalanceMock.mockReturnValue({
      hasInsufficientBalance: true,
      nativeCurrency: mockNativeCurrency,
    });
  });

  it('return empty array when no transaction metadata is available', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHook(() => useInsufficientBalanceAlert());
    expect(result.current).toEqual([]);
  });

  it('return empty array when isTransactionValueUpdating is true', () => {
    mockUseConfirmationContext.mockReturnValue({
      isTransactionValueUpdating: true,
    } as unknown as ReturnType<typeof useConfirmationContext>);

    const { result } = renderHook(() => useInsufficientBalanceAlert());
    expect(result.current).toEqual([]);
  });

  it('return alert when balance is insufficient and has GasFeeTokens but not selected gas fee token', () => {
    useIsGaslessSupportedMock.mockReturnValueOnce({
      isSmartTransaction: true,
      isSupported: true,
      pending: false,
    });
    mockSelectUseTransactionSimulations.mockReturnValueOnce(true);
    const txWithGasFeeTokens = {
      ...mockTransaction,
      gasFeeTokens: [
        {
          tokenAddress: '0xabc' as Hex,
          symbol: 'GFT',
          decimals: 18,
        },
      ],
    } as unknown as TransactionMeta;
    mockUseTransactionMetadataRequest.mockReturnValue(txWithGasFeeTokens);

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

  it('returns empty array if transaction type ignored', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...mockTransaction,
      type: TransactionType.predictWithdraw,
    } as unknown as TransactionMeta);

    const { result } = renderHook(() => useInsufficientBalanceAlert());

    expect(result.current).toStrictEqual([]);
  });

  it('returns empty array when using pay source amounts', () => {
    useTransactionPayHasSourceAmountMock.mockReturnValue(true);

    const { result } = renderHook(() => useInsufficientBalanceAlert());

    expect(result.current).toEqual([]);
  });

  describe('when ignoreGasFeeToken is true', () => {
    it('returns empty array', () => {
      useHasInsufficientBalanceMock.mockReturnValue({
        hasInsufficientBalance: false,
        nativeCurrency: mockNativeCurrency,
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

  describe('when isGasFeeSponsored is true', () => {
    it('returns empty array', () => {
      useIsGaslessSupportedMock.mockReturnValue({
        isSmartTransaction: true,
        isSupported: true,
        pending: false,
      });
      mockUseAccountNativeBalance.mockReturnValue({
        balanceWeiInHex: '0xC',
      } as unknown as ReturnType<typeof useAccountNativeBalance>);
      const txWithGasFeeSponsored = {
        ...mockTransaction,
        isGasFeeSponsored: true,
      };
      mockUseTransactionMetadataRequest.mockReturnValue(txWithGasFeeSponsored);

      const { result } = renderHook(() => useInsufficientBalanceAlert());
      expect(result.current).toEqual([]);
    });
  });
});
