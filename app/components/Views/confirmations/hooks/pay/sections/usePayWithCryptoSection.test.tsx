import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../../util/navigation/navUtils';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { TokenIcon, TokenIconVariant } from '../../../components/token-icon';
import { usePayWithPreferredToken } from '../usePayWithPreferredToken';
import { usePayWithSelectedToken } from '../usePayWithSelectedToken';
import { usePayWithCryptoSection } from './usePayWithCryptoSection';

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
jest.mock('../usePayWithPreferredToken');
jest.mock('../usePayWithSelectedToken');

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
  const useNavigationMock = jest.mocked(useNavigation);
  const useFiatFormatterMock = jest.mocked(useFiatFormatter);
  const useParamsMock = jest.mocked(useParams);
  const usePayWithPreferredTokenMock = jest.mocked(usePayWithPreferredToken);
  const usePayWithSelectedTokenMock = jest.mocked(usePayWithSelectedToken);
  const navigateMock = jest.fn();
  const goBackMock = jest.fn();
  const selectTokenMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useNavigationMock.mockReturnValue({
      navigate: navigateMock,
      goBack: goBackMock,
    } as never);
    useParamsMock.mockReturnValue({});
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

    expect(selectTokenMock).toHaveBeenCalledWith({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });
    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses the sheet when the already-selected preferred token row is pressed', () => {
    const { result } = renderHook(() => usePayWithCryptoSection());

    act(() => {
      result.current?.rows[0].onPress?.();
    });

    expect(selectTokenMock).toHaveBeenCalledWith({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });
    expect(goBackMock).toHaveBeenCalledTimes(1);
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
    );
  });
});
