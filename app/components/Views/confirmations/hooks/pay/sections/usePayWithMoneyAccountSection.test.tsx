import { renderHook, act } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../../core/Engine';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import { selectMetaMaskPayFlags } from '../../../../../../selectors/featureFlagController/confirmations';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import {
  usePayWithMoneyAccountSection,
  PAY_WITH_MONEY_ACCOUNT_SECTION_TEST_ID,
  PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID,
} from './usePayWithMoneyAccountSection';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn().mockReturnValue({ goBack: jest.fn() }),
}));
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { balance?: string }) => {
    const translations: Record<string, string> = {
      'confirm.pay_with_bottom_sheet.available_balance': `${
        params?.balance ?? ''
      } available`,
      'confirm.pay_with_bottom_sheet.money_account': 'Money account',
    };
    return translations[key] ?? key;
  },
}));
jest.mock('../../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));

describe('usePayWithMoneyAccountSection', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useMoneyAccountBalanceMock = jest.mocked(useMoneyAccountBalance);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const MONEY_ACCOUNT_ADDRESS = '0xc4ff9e84b5754570812d891ade0bad3952bb5946';
  const moneyAccountMock = {
    id: 'ma-1',
    balance: '100',
    address: MONEY_ACCOUNT_ADDRESS,
  };

  beforeEach(() => {
    jest.resetAllMocks();

    jest.mocked(useNavigation).mockReturnValue({ goBack: jest.fn() } as never);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.perpsDeposit,
      txParams: {},
    } as never);

    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return moneyAccountMock;
      }
      if (selector === selectMetaMaskPayFlags) {
        return {
          enableMoneyAccountTransactions: {
            perpsDeposit: true,
            perpsWithdraw: true,
            predictDeposit: true,
            predictWithdraw: true,
          },
        };
      }
      return undefined;
    });

    useMoneyAccountBalanceMock.mockReturnValue({
      totalFiatFormatted: '$100.00',
    } as never);
  });

  it('returns null when all money account flags are false', () => {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return moneyAccountMock;
      }
      if (selector === selectMetaMaskPayFlags) {
        return {
          enableMoneyAccountTransactions: {},
        };
      }
      return undefined;
    });

    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    expect(result.current).toBeNull();
  });

  it('returns null for predict transaction when only perps types are enabled', () => {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return moneyAccountMock;
      }
      if (selector === selectMetaMaskPayFlags) {
        return {
          enableMoneyAccountTransactions: {
            perpsDeposit: true,
            perpsWithdraw: true,
          },
        };
      }
      return undefined;
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.predictDeposit,
      txParams: {},
    } as never);

    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    expect(result.current).toBeNull();
  });

  it('returns null for perps transaction when only predict types are enabled', () => {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return moneyAccountMock;
      }
      if (selector === selectMetaMaskPayFlags) {
        return {
          enableMoneyAccountTransactions: {
            predictDeposit: true,
            predictWithdraw: true,
          },
        };
      }
      return undefined;
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.perpsDeposit,
      txParams: {},
    } as never);

    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    expect(result.current).toBeNull();
  });

  it('returns null when transaction type is not supported', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.simpleSend,
      txParams: {},
    } as never);

    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    expect(result.current).toBeNull();
  });

  it('returns null when there is no money account', () => {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return null;
      }
      if (selector === selectMetaMaskPayFlags) {
        return {
          enableMoneyAccountTransactions: {
            perpsDeposit: true,
            perpsWithdraw: true,
            predictDeposit: true,
            predictWithdraw: true,
          },
        };
      }
      return undefined;
    });

    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    expect(result.current).toBeNull();
  });

  it('returns null when there is no transaction metadata', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    expect(result.current).toBeNull();
  });

  it.each([
    TransactionType.perpsDeposit,
    TransactionType.predictDeposit,
    TransactionType.perpsWithdraw,
    TransactionType.predictWithdraw,
  ])(
    'returns section config with "available" subtitle for transaction type %s',
    (txType) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: txType,
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePayWithMoneyAccountSection());

      expect(result.current).toEqual(
        expect.objectContaining({
          id: 'money-account',
          title: '',
          testID: PAY_WITH_MONEY_ACCOUNT_SECTION_TEST_ID,
        }),
      );
      expect(result.current?.rows).toHaveLength(1);
      expect(result.current?.rows[0]).toEqual(
        expect.objectContaining({
          id: 'money-account-musd',
          title: 'Money account',
          subtitle: '$100.00 available',
          isSelected: false,
          trailingElement: 'none',
          testID: PAY_WITH_MONEY_ACCOUNT_ROW_TEST_ID,
        }),
      );
    },
  );

  it('renders subtitle with formatted balance', () => {
    useMoneyAccountBalanceMock.mockReturnValue({
      totalFiatFormatted: '$250.50',
    } as never);

    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    expect(result.current?.rows[0].subtitle).toBe('$250.50 available');
  });

  it('renders undefined subtitle when totalFiatFormatted is falsy', () => {
    useMoneyAccountBalanceMock.mockReturnValue({
      totalFiatFormatted: '',
    } as never);

    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    expect(result.current?.rows[0].subtitle).toBeUndefined();
  });

  it('renders an Image icon with the money.png source', () => {
    const { result } = renderHook(() => usePayWithMoneyAccountSection());

    const icon = result.current?.rows[0].icon as React.ReactElement<{
      source: number;
    }>;
    expect(icon).toBeDefined();
    expect(icon.props.source).toBeDefined();
  });

  it('keeps the result reference stable across renders when nothing changes', () => {
    const { result, rerender } = renderHook(() =>
      usePayWithMoneyAccountSection(),
    );
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });

  describe('handlePress', () => {
    it('sets paymentOverride and refundTo on press', () => {
      const setConfigMock = jest.mocked(
        Engine.context.TransactionPayController.setTransactionConfig,
      );
      const { result } = renderHook(() => usePayWithMoneyAccountSection());

      act(() => {
        result.current?.rows[0].onPress?.();
      });

      expect(setConfigMock).toHaveBeenCalledWith('tx-1', expect.any(Function));

      const config = {} as Record<string, unknown>;
      setConfigMock.mock.calls[0][1](config as never);

      expect(config.paymentOverride).toBe(PaymentOverride.MoneyAccount);
      expect(config.refundTo).toBe(MONEY_ACCOUNT_ADDRESS);
    });

    it('navigates back on press', () => {
      const goBackMock = jest.fn();
      jest
        .mocked(useNavigation)
        .mockReturnValue({ goBack: goBackMock } as never);

      const { result } = renderHook(() => usePayWithMoneyAccountSection());

      act(() => {
        result.current?.rows[0].onPress?.();
      });

      expect(goBackMock).toHaveBeenCalled();
    });
  });
});
