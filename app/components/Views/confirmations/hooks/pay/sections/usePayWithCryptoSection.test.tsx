import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  PaymentOverride,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../../util/navigation/navUtils';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { TokenIcon, TokenIconVariant } from '../../../components/token-icon';
import { MUSD_TOKEN_ADDRESS } from '../../../../../UI/Earn/constants/musd';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { useIsPerpsBalanceSelected } from '../../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { usePerpsPaymentToken } from '../../../../../UI/Perps/hooks/usePerpsPaymentToken';
import { useLastUsedPaymentMethod } from '../useLastUsedPaymentMethod';
import { usePayWithPreferredToken } from '../usePayWithPreferredToken';
import { usePayWithSelectedToken } from '../usePayWithSelectedToken';
import { useTransactionPayFiatPayment } from '../useTransactionPayData';
import { useTransactionPayToken } from '../useTransactionPayToken';
import { usePayWithCryptoSection } from './usePayWithCryptoSection';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { balance?: string }) => {
    const translations: Record<string, string> = {
      'confirm.pay_with_bottom_sheet.crypto': 'Crypto',
      'confirm.pay_with_bottom_sheet.available_balance': `${
        params?.balance ?? ''
      } available`,
      'confirm.pay_with_bottom_sheet.other_assets': 'Other assets',
      'confirm.pay_with_bottom_sheet.other_assets_description':
        'Select from your tokens',
    };

    return translations[key] ?? key;
  },
}));
jest.mock('../../../../../../util/navigation/navUtils');
jest.mock('../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');
jest.mock('../../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../UI/Perps/hooks/useIsPerpsBalanceSelected');
jest.mock('../../../../../UI/Perps/hooks/usePerpsPaymentToken');
jest.mock('../useLastUsedPaymentMethod');
jest.mock('../usePayWithPreferredToken');
jest.mock('../usePayWithSelectedToken');
jest.mock('../useTransactionPayData');
jest.mock('../useTransactionPayToken');

const TOKEN_MOCK: TransactionPaymentToken = {
  address: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
  balanceFiat: '$12.34',
  balanceHuman: '12.34',
  balanceRaw: '12340000',
  balanceUsd: '12.34',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

const SELECTED_TOKEN_MOCK = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
  balanceUsd: '20',
  chainId: '0x1' as Hex,
  symbol: 'POL',
};

describe('usePayWithCryptoSection', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useNavigationMock = jest.mocked(useNavigation);
  const useFiatFormatterMock = jest.mocked(useFiatFormatter);
  const useParamsMock = jest.mocked(useParams);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const usePayWithPreferredTokenMock = jest.mocked(usePayWithPreferredToken);
  const usePayWithSelectedTokenMock = jest.mocked(usePayWithSelectedToken);
  const useLastUsedPaymentMethodMock = jest.mocked(useLastUsedPaymentMethod);
  const useIsPerpsBalanceSelectedMock = jest.mocked(useIsPerpsBalanceSelected);
  const usePerpsPaymentTokenMock = jest.mocked(usePerpsPaymentToken);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const navigateMock = jest.fn();
  const goBackMock = jest.fn();
  const selectTokenMock = jest.fn();
  const setPayTokenMock = jest.fn();
  const onPerpsPaymentTokenChangeMock = jest.fn();
  const isLastUsedMock = jest.fn().mockReturnValue(false);

  beforeEach(() => {
    jest.resetAllMocks();

    useSelectorMock.mockReturnValue(undefined);

    useNavigationMock.mockReturnValue({
      navigate: navigateMock,
      goBack: goBackMock,
      isFocused: jest.fn().mockReturnValue(true),
    } as never);
    useParamsMock.mockReturnValue({});
    useTransactionMetadataRequestMock.mockReturnValue(undefined);
    useFiatFormatterMock.mockReturnValue((value) => `$${value.toFixed(2)}`);
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: TOKEN_MOCK,
      selectedToken: TOKEN_MOCK,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: false,
      selectedToken: {
        address: TOKEN_MOCK.address,
        balanceUsd: TOKEN_MOCK.balanceUsd,
        chainId: TOKEN_MOCK.chainId,
        symbol: TOKEN_MOCK.symbol,
      },
      selectToken: selectTokenMock,
    });
    isLastUsedMock.mockReturnValue(false);
    useLastUsedPaymentMethodMock.mockReturnValue({
      lastUsedToken: undefined,
      isLastUsed: isLastUsedMock,
    });
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);
    usePerpsPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPerpsPaymentTokenChangeMock,
    });
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_MOCK,
      setPayToken: setPayTokenMock,
    });
  });

  it('passes route preferred payment token params to both pay-with hooks', () => {
    const preferredPaymentToken = {
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    };
    useParamsMock.mockReturnValue({ preferredPaymentToken });

    renderHook(() => usePayWithCryptoSection());

    expect(usePayWithPreferredTokenMock).toHaveBeenCalledWith({
      preferredToken: preferredPaymentToken,
    });
    expect(usePayWithSelectedTokenMock).toHaveBeenCalledWith({
      preferredToken: preferredPaymentToken,
    });
  });

  it('resolves the mUSD fallback for moneyAccountWithdraw and passes it to both pay-with hooks', () => {
    useParamsMock.mockReturnValue({});
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: {},
    } as never);

    renderHook(() => usePayWithCryptoSection());

    const expectedPreferred = {
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MAINNET,
    };
    expect(usePayWithPreferredTokenMock).toHaveBeenCalledWith({
      preferredToken: expectedPreferred,
    });
    expect(usePayWithSelectedTokenMock).toHaveBeenCalledWith({
      preferredToken: expectedPreferred,
    });
  });

  it('passes the same preferred token reference to both pay-with hooks (single resolution)', () => {
    useParamsMock.mockReturnValue({});
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: {},
    } as never);

    renderHook(() => usePayWithCryptoSection());

    const preferredArg =
      usePayWithPreferredTokenMock.mock.calls[0][0]?.preferredToken;
    const selectedArg =
      usePayWithSelectedTokenMock.mock.calls[0][0]?.preferredToken;
    expect(preferredArg).toBeDefined();
    expect(selectedArg).toBe(preferredArg);
  });

  it('returns null when the user has no crypto tokens', () => {
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: false,
      preferredToken: undefined,
      selectedToken: undefined,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current).toBeNull();
  });

  it('returns the other assets row when the user has crypto but no preferred token', () => {
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: undefined,
      selectedToken: undefined,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: false,
      selectedToken: undefined,
      selectToken: selectTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows).toHaveLength(1);
    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-other-assets',
        title: 'Other assets',
        trailingElement: 'chevron',
      }),
    );
  });

  it('returns the crypto section with preferred token and other assets rows', () => {
    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current).toEqual(
      expect.objectContaining({
        id: 'crypto',
        title: 'Crypto',
        testID: 'pay-with-section-crypto',
      }),
    );
    expect(result.current?.rows).toHaveLength(2);
    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-preferred-token',
        title: 'USDC',
        subtitle: '$12.34 available',
        isSelected: true,
        trailingElement: 'checkmark',
        testID: 'pay-with-crypto-section-preferred-token-row',
      }),
    );
    expect(result.current?.rows[0].icon).toEqual(
      expect.objectContaining({
        type: TokenIcon,
        props: expect.objectContaining({
          address: TOKEN_MOCK.address,
          chainId: TOKEN_MOCK.chainId,
          variant: TokenIconVariant.Row,
        }),
      }),
    );
    expect(result.current?.rows[0].icon).not.toEqual(
      expect.objectContaining({
        props: expect.objectContaining({ showNetwork: false }),
      }),
    );
    expect(result.current?.rows[1]).toEqual(
      expect.objectContaining({
        id: 'crypto-other-assets',
        title: 'Other assets',
        subtitle: 'Select from your tokens',
        trailingElement: 'chevron',
        testID: 'pay-with-crypto-section-other-assets-row',
      }),
    );
    expect(result.current?.rows[1].icon).toEqual(expect.any(Object));
  });

  it('does not mark the preferred token row as selected on perpsDepositAndOrder flows when Perps balance is the implicit default', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDepositAndOrder,
      txParams: {},
    } as never);
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-preferred-token',
        isSelected: false,
        trailingElement: 'none',
      }),
    );
  });

  it('still marks the preferred token row as selected on perpsDepositAndOrder flows when the user explicitly picked the preferred token via "Other assets"', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDepositAndOrder,
      txParams: {},
    } as never);
    useIsPerpsBalanceSelectedMock.mockReturnValue(false);

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-preferred-token',
        isSelected: true,
        trailingElement: 'checkmark',
      }),
    );
  });

  it('does not select the preferred token row when another token is selected', () => {
    const distinctSelectedToken = {
      ...TOKEN_MOCK,
      address: SELECTED_TOKEN_MOCK.address,
      symbol: SELECTED_TOKEN_MOCK.symbol,
    };
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: TOKEN_MOCK,
      selectedToken: distinctSelectedToken,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-preferred-token',
        isSelected: false,
        trailingElement: 'none',
      }),
    );
  });

  it('adds the user-selected token row with a checkmark when distinct from the automatic candidate', () => {
    const distinctSelectedToken = {
      ...TOKEN_MOCK,
      address: SELECTED_TOKEN_MOCK.address,
      symbol: SELECTED_TOKEN_MOCK.symbol,
      balanceUsd: SELECTED_TOKEN_MOCK.balanceUsd,
    };
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: TOKEN_MOCK,
      selectedToken: distinctSelectedToken,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows).toHaveLength(3);
    expect(result.current?.rows[1]).toEqual(
      expect.objectContaining({
        id: 'crypto-selected-token',
        title: SELECTED_TOKEN_MOCK.symbol,
        subtitle: '$20.00 available',
        isSelected: true,
        trailingElement: 'checkmark',
        testID: 'pay-with-crypto-section-selected-token-row',
      }),
    );
    expect(result.current?.rows[1].icon).toEqual(
      expect.objectContaining({
        type: TokenIcon,
        props: expect.objectContaining({
          address: SELECTED_TOKEN_MOCK.address,
          chainId: SELECTED_TOKEN_MOCK.chainId,
          variant: TokenIconVariant.Row,
        }),
      }),
    );
    expect(result.current?.rows[2]).toEqual(
      expect.objectContaining({
        id: 'crypto-other-assets',
      }),
    );
  });

  it('omits the user-selected token row when the selection matches the automatic candidate', () => {
    const { result } = renderHook(() => usePayWithCryptoSection());

    const selectedRow = result.current?.rows.find(
      (row) => row.id === 'crypto-selected-token',
    );
    expect(selectedRow).toBeUndefined();
  });

  it('renders only the user-selected and other-assets rows when there is no preferred token', () => {
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: undefined,
      selectedToken: undefined,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows).toHaveLength(2);
    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-selected-token',
        title: SELECTED_TOKEN_MOCK.symbol,
        isSelected: true,
        trailingElement: 'checkmark',
      }),
    );
    expect(result.current?.rows[1]).toEqual(
      expect.objectContaining({
        id: 'crypto-other-assets',
      }),
    );
  });

  it('selects the preferred token and dismisses the sheet when its row is pressed', () => {
    const distinctSelectedToken = {
      ...TOKEN_MOCK,
      address: SELECTED_TOKEN_MOCK.address,
      symbol: SELECTED_TOKEN_MOCK.symbol,
    };
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: TOKEN_MOCK,
      selectedToken: distinctSelectedToken,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    act(() => {
      result.current?.rows[0].onPress?.();
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });
    expect(onPerpsPaymentTokenChangeMock).not.toHaveBeenCalled();
    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses the sheet when the already-selected preferred token row is pressed', () => {
    const { result } = renderHook(() => usePayWithCryptoSection());

    act(() => {
      result.current?.rows[0].onPress?.();
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });
    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('clears the fiat selection when the preferred token row is pressed while a fiat method is active', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    act(() => {
      result.current?.rows[0].onPress?.();
    });

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });
    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('routes the preferred-row tap through onPerpsPaymentTokenChange on perpsDepositAndOrder flows', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDepositAndOrder,
    } as never);
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);

    const { result } = renderHook(() => usePayWithCryptoSection());

    act(() => {
      result.current?.rows[0].onPress?.();
    });

    expect(onPerpsPaymentTokenChangeMock).toHaveBeenCalledWith({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });
    expect(setPayTokenMock).not.toHaveBeenCalled();
    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('hides the user-selected token row when Perps balance is the implicit default on perpsDepositAndOrder flows', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDepositAndOrder,
    } as never);
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);
    const distinctSelectedToken = {
      ...TOKEN_MOCK,
      address: SELECTED_TOKEN_MOCK.address,
      symbol: SELECTED_TOKEN_MOCK.symbol,
    };
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: TOKEN_MOCK,
      selectedToken: distinctSelectedToken,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    const selectedRow = result.current?.rows.find(
      (row) => row.id === 'crypto-selected-token',
    );

    expect(selectedRow).toBeUndefined();
  });

  it('does not assign a tap handler to the user-selected token row', () => {
    const distinctSelectedToken = {
      ...TOKEN_MOCK,
      address: SELECTED_TOKEN_MOCK.address,
      symbol: SELECTED_TOKEN_MOCK.symbol,
    };
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: TOKEN_MOCK,
      selectedToken: distinctSelectedToken,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows[1].onPress).toBeUndefined();
  });

  it('navigates to the existing PayWithModal from the other assets row', () => {
    const { result } = renderHook(() => usePayWithCryptoSection());

    const otherAssetsRow = result.current?.rows.find(
      (row) => row.id === 'crypto-other-assets',
    );

    act(() => {
      otherAssetsRow?.onPress?.();
    });

    expect(navigateMock).toHaveBeenCalledWith(
      Routes.CONFIRMATION_PAY_WITH_MODAL,
      { dismissOnSelectCount: 2 },
    );
  });

  it('marks the preferred row as last used when the last-used token matches it', () => {
    isLastUsedMock.mockImplementation(
      (address, chainId) =>
        address === TOKEN_MOCK.address && chainId === TOKEN_MOCK.chainId,
    );

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-preferred-token',
        isLastUsed: true,
      }),
    );
  });

  it('does not mark any row as last used when the last-used token does not match', () => {
    isLastUsedMock.mockReturnValue(false);

    const { result } = renderHook(() => usePayWithCryptoSection());

    for (const row of result.current?.rows ?? []) {
      expect(row.isLastUsed ?? false).toBe(false);
    }
  });

  it('marks the user-selected row as last used when the last-used token matches the selected token', () => {
    const distinctSelectedToken = {
      ...TOKEN_MOCK,
      address: SELECTED_TOKEN_MOCK.address,
      symbol: SELECTED_TOKEN_MOCK.symbol,
      balanceUsd: SELECTED_TOKEN_MOCK.balanceUsd,
    };
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: TOKEN_MOCK,
      selectedToken: distinctSelectedToken,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });
    isLastUsedMock.mockImplementation(
      (address, chainId) =>
        address === SELECTED_TOKEN_MOCK.address &&
        chainId === SELECTED_TOKEN_MOCK.chainId,
    );

    const { result } = renderHook(() => usePayWithCryptoSection());

    const preferredRow = result.current?.rows.find(
      (row) => row.id === 'crypto-preferred-token',
    );
    const selectedRow = result.current?.rows.find(
      (row) => row.id === 'crypto-selected-token',
    );

    expect(preferredRow?.isLastUsed ?? false).toBe(false);
    expect(selectedRow).toEqual(expect.objectContaining({ isLastUsed: true }));
  });

  it('never marks the other-assets row as last used', () => {
    isLastUsedMock.mockReturnValue(true);

    const { result } = renderHook(() => usePayWithCryptoSection());

    const otherAssetsRow = result.current?.rows.find(
      (row) => row.id === 'crypto-other-assets',
    );

    expect(otherAssetsRow?.isLastUsed ?? false).toBe(false);
  });

  it('suppresses the preferred token row checkmark when a fiat payment method is selected', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    const preferredRow = result.current?.rows.find(
      (row) => row.id === 'crypto-preferred-token',
    );

    expect(preferredRow).toEqual(
      expect.objectContaining({
        isSelected: false,
        trailingElement: 'none',
      }),
    );
  });

  it('hides the user-selected token row when a fiat payment method is selected', () => {
    const distinctSelectedToken = {
      ...TOKEN_MOCK,
      address: SELECTED_TOKEN_MOCK.address,
      symbol: SELECTED_TOKEN_MOCK.symbol,
      balanceUsd: SELECTED_TOKEN_MOCK.balanceUsd,
    };
    usePayWithPreferredTokenMock.mockReturnValue({
      hasTokens: true,
      preferredToken: TOKEN_MOCK,
      selectedToken: distinctSelectedToken,
    });
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    const selectedRow = result.current?.rows.find(
      (row) => row.id === 'crypto-selected-token',
    );

    expect(selectedRow).toBeUndefined();
  });

  describe('money account selected', () => {
    beforeEach(() => {
      useSelectorMock.mockReturnValue(PaymentOverride.MoneyAccount);
    });

    it('suppresses preferred token row checkmark when money account is selected', () => {
      const { result } = renderHook(() => usePayWithCryptoSection());

      const preferredRow = result.current?.rows.find(
        (row) => row.id === 'crypto-preferred-token',
      );

      expect(preferredRow).toEqual(
        expect.objectContaining({
          isSelected: false,
          trailingElement: 'none',
        }),
      );
    });

    it('hides user-selected token row when money account is selected', () => {
      const distinctSelectedToken = {
        ...TOKEN_MOCK,
        address: SELECTED_TOKEN_MOCK.address,
        symbol: SELECTED_TOKEN_MOCK.symbol,
        balanceUsd: SELECTED_TOKEN_MOCK.balanceUsd,
      };
      usePayWithPreferredTokenMock.mockReturnValue({
        hasTokens: true,
        preferredToken: TOKEN_MOCK,
        selectedToken: distinctSelectedToken,
      });
      usePayWithSelectedTokenMock.mockReturnValue({
        isSelectedDistinctFromAutomatic: true,
        selectedToken: SELECTED_TOKEN_MOCK,
        selectToken: selectTokenMock,
      });

      const { result } = renderHook(() => usePayWithCryptoSection());

      const selectedRow = result.current?.rows.find(
        (row) => row.id === 'crypto-selected-token',
      );

      expect(selectedRow).toBeUndefined();
    });

    it('omits preferred token row when it matches MUSD on MONAD', () => {
      usePayWithPreferredTokenMock.mockReturnValue({
        hasTokens: true,
        preferredToken: {
          ...TOKEN_MOCK,
          address: MUSD_TOKEN_ADDRESS,
          chainId: CHAIN_IDS.MONAD,
          symbol: 'mUSD',
        },
        selectedToken: TOKEN_MOCK,
      });

      const { result } = renderHook(() => usePayWithCryptoSection());

      const preferredRow = result.current?.rows.find(
        (row) => row.id === 'crypto-preferred-token',
      );

      expect(preferredRow).toBeUndefined();
      expect(result.current?.rows).toHaveLength(1);
      expect(result.current?.rows[0]).toEqual(
        expect.objectContaining({ id: 'crypto-other-assets' }),
      );
    });
  });
});
