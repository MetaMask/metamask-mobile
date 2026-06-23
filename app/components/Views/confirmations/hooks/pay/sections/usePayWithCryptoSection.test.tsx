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
import { usePredictPaymentToken } from '../../../../../UI/Predict/hooks/usePredictPaymentToken';
import { useLastUsedPaymentMethod } from '../useLastUsedPaymentMethod';
import { usePayWithNoFeeToken } from '../usePayWithNoFeeToken';
import { usePayWithPreferredToken } from '../usePayWithPreferredToken';
import { usePayWithSelectedToken } from '../usePayWithSelectedToken';
import { useTransactionPayFiatPayment } from '../useTransactionPayData';
import { useTransactionPayToken } from '../useTransactionPayToken';
import Engine from '../../../../../../core/Engine';
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
      'confirm.pay_with_bottom_sheet.other_assets_receive_description':
        'Select the token you want to receive',
    };

    return translations[key] ?? key;
  },
}));
jest.mock('../../../../../../util/navigation/navUtils');
jest.mock('../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');
jest.mock('../../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));
jest.mock('../../../../../UI/Perps/hooks/useIsPerpsBalanceSelected');
jest.mock('../../../../../UI/Perps/hooks/usePerpsPaymentToken');
jest.mock('../../../../../UI/Predict/hooks/usePredictPaymentToken');
jest.mock('../useLastUsedPaymentMethod');
jest.mock('../usePayWithNoFeeToken');
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
  balanceUsd: '5',
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
  const usePayWithNoFeeTokenMock = jest.mocked(usePayWithNoFeeToken);

  const NO_FEE_TAG_SENTINEL = '__no-fee-tag__';
  const LAST_USED_TAG_SENTINEL = '__last-used-tag__';

  const hasTag = (
    row: { tagRenderers?: (() => unknown)[] } | undefined,
    sentinel: string,
  ): boolean =>
    row?.tagRenderers?.some((render) => render() === sentinel) ?? false;
  const usePayWithPreferredTokenMock = jest.mocked(usePayWithPreferredToken);
  const usePayWithSelectedTokenMock = jest.mocked(usePayWithSelectedToken);
  const useLastUsedPaymentMethodMock = jest.mocked(useLastUsedPaymentMethod);
  const useIsPerpsBalanceSelectedMock = jest.mocked(useIsPerpsBalanceSelected);
  const usePerpsPaymentTokenMock = jest.mocked(usePerpsPaymentToken);
  const usePredictPaymentTokenMock = jest.mocked(usePredictPaymentToken);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const navigateMock = jest.fn();
  const goBackMock = jest.fn();
  const selectTokenMock = jest.fn();
  const setPayTokenMock = jest.fn();
  const onPerpsPaymentTokenChangeMock = jest.fn();
  const onPredictPaymentTokenChangeMock = jest.fn();
  const resetPredictPaymentTokenMock = jest.fn();
  const isLastUsedMock = jest.fn().mockReturnValue(false);
  const isNoFeeTokenSharedMock = jest.fn().mockReturnValue(false);
  const renderNoFeeTagForTokenSharedMock = jest.fn(
    (address: string, chainId: string) =>
      isNoFeeTokenSharedMock(address, chainId) ? NO_FEE_TAG_SENTINEL : null,
  );
  const renderLastUsedTagSharedMock = jest.fn(
    (address: string, chainId: string) =>
      isLastUsedMock(address, chainId) ? LAST_USED_TAG_SENTINEL : null,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useSelectorMock.mockReturnValue(undefined);

    isNoFeeTokenSharedMock.mockReturnValue(false);
    renderNoFeeTagForTokenSharedMock.mockImplementation(
      (address: string, chainId: string) =>
        isNoFeeTokenSharedMock(address, chainId) ? NO_FEE_TAG_SENTINEL : null,
    );
    renderLastUsedTagSharedMock.mockImplementation(
      (address: string, chainId: string) =>
        isLastUsedMock(address, chainId) ? LAST_USED_TAG_SENTINEL : null,
    );

    usePayWithNoFeeTokenMock.mockReturnValue({
      noFeeToken: undefined,
      isNoFeeToken: isNoFeeTokenSharedMock,
      renderNoFeeTag: jest.fn().mockReturnValue(null),
      renderNoFeeTagForToken: renderNoFeeTagForTokenSharedMock,
    });

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
      renderLastUsedTag: renderLastUsedTagSharedMock,
    });
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);
    usePerpsPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPerpsPaymentTokenChangeMock,
    });
    usePredictPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPredictPaymentTokenChangeMock,
      isPredictBalanceSelected: true,
      selectedPaymentToken: null,
      resetSelectedPaymentToken: resetPredictPaymentTokenMock,
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
      chainId: CHAIN_IDS.MONAD,
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
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
      txParams: {},
    } as never);
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

  it('omits the "available" suffix on subtitles for order-and-deposit flows but keeps the default "Other assets" copy', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDepositAndOrder,
      txParams: {},
    } as never);
    useIsPerpsBalanceSelectedMock.mockReturnValue(false);

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-preferred-token',
        subtitle: '$12.34',
      }),
    );
    expect(result.current?.rows[1]).toEqual(
      expect.objectContaining({
        id: 'crypto-other-assets',
        subtitle: 'Select from your tokens',
      }),
    );
  });

  it('omits the "available" suffix on subtitles and uses the withdraw "Other assets" copy in withdraw flows', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: {},
    } as never);
    usePayWithSelectedTokenMock.mockReturnValue({
      isSelectedDistinctFromAutomatic: true,
      selectedToken: SELECTED_TOKEN_MOCK,
      selectToken: selectTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    expect(result.current?.rows).toHaveLength(3);
    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'crypto-preferred-token',
        subtitle: '$12.34',
      }),
    );
    expect(result.current?.rows[1]).toEqual(
      expect.objectContaining({
        id: 'crypto-selected-token',
        subtitle: '$5.00',
      }),
    );
    expect(result.current?.rows[2]).toEqual(
      expect.objectContaining({
        id: 'crypto-other-assets',
        subtitle: 'Select the token you want to receive',
      }),
    );
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
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
      txParams: {},
    } as never);
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
        subtitle: '$5.00 available',
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

  it('does not mark the preferred token row as selected on predictDepositAndOrder flows when Predict balance is the implicit default', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictDepositAndOrder,
    } as never);
    usePredictPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPredictPaymentTokenChangeMock,
      isPredictBalanceSelected: true,
      selectedPaymentToken: null,
      resetSelectedPaymentToken: resetPredictPaymentTokenMock,
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

  it('still marks the preferred token row as selected on predictDepositAndOrder flows when the user explicitly picked the preferred token via "Other assets"', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictDepositAndOrder,
    } as never);
    usePredictPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPredictPaymentTokenChangeMock,
      isPredictBalanceSelected: false,
      selectedPaymentToken: {
        address: TOKEN_MOCK.address,
        chainId: TOKEN_MOCK.chainId,
      },
      resetSelectedPaymentToken: resetPredictPaymentTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    const preferredRow = result.current?.rows.find(
      (row) => row.id === 'crypto-preferred-token',
    );

    expect(preferredRow).toEqual(
      expect.objectContaining({
        isSelected: true,
        trailingElement: 'checkmark',
      }),
    );
  });

  it('routes the preferred-row tap through onPredictPaymentTokenChange AND setPayToken on predictDepositAndOrder flows', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictDepositAndOrder,
    } as never);
    usePredictPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPredictPaymentTokenChangeMock,
      isPredictBalanceSelected: true,
      selectedPaymentToken: null,
      resetSelectedPaymentToken: resetPredictPaymentTokenMock,
    });

    const { result } = renderHook(() => usePayWithCryptoSection());

    act(() => {
      result.current?.rows[0].onPress?.();
    });

    expect(onPredictPaymentTokenChangeMock).toHaveBeenCalledWith({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });
    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });
    expect(onPerpsPaymentTokenChangeMock).not.toHaveBeenCalled();
    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('hides the user-selected token row when Predict balance is the implicit default on predictDepositAndOrder flows', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictDepositAndOrder,
    } as never);
    usePredictPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPredictPaymentTokenChangeMock,
      isPredictBalanceSelected: true,
      selectedPaymentToken: null,
      resetSelectedPaymentToken: resetPredictPaymentTokenMock,
    });
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

  it('renders the last-used tag on the preferred row when the last-used token matches it', () => {
    isLastUsedMock.mockImplementation(
      (address, chainId) =>
        address === TOKEN_MOCK.address && chainId === TOKEN_MOCK.chainId,
    );

    const { result } = renderHook(() => usePayWithCryptoSection());

    const preferredRow = result.current?.rows.find(
      (row) => row.id === 'crypto-preferred-token',
    );
    expect(hasTag(preferredRow, LAST_USED_TAG_SENTINEL)).toBe(true);
  });

  it('does not render the last-used tag when no row matches the last-used token', () => {
    isLastUsedMock.mockReturnValue(false);

    const { result } = renderHook(() => usePayWithCryptoSection());

    for (const row of result.current?.rows ?? []) {
      expect(hasTag(row, LAST_USED_TAG_SENTINEL)).toBe(false);
    }
  });

  it('renders the last-used tag on the user-selected row when the last-used token matches the selected token', () => {
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

    expect(hasTag(preferredRow, LAST_USED_TAG_SENTINEL)).toBe(false);
    expect(hasTag(selectedRow, LAST_USED_TAG_SENTINEL)).toBe(true);
  });

  it('never renders the last-used tag on the other-assets row', () => {
    isLastUsedMock.mockReturnValue(true);

    const { result } = renderHook(() => usePayWithCryptoSection());

    const otherAssetsRow = result.current?.rows.find(
      (row) => row.id === 'crypto-other-assets',
    );

    expect(hasTag(otherAssetsRow, LAST_USED_TAG_SENTINEL)).toBe(false);
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

    it('clears paymentOverride when preferred crypto token is pressed', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-money-1',
        txParams: {},
      } as never);

      const setTransactionConfigMock = jest.mocked(
        Engine.context.TransactionPayController.setTransactionConfig,
      );

      const { result } = renderHook(() => usePayWithCryptoSection());

      act(() => {
        result.current?.rows[0].onPress?.();
      });

      expect(setPayTokenMock).toHaveBeenCalledWith({
        address: TOKEN_MOCK.address,
        chainId: TOKEN_MOCK.chainId,
      });
      expect(setTransactionConfigMock).toHaveBeenCalledWith(
        'tx-money-1',
        expect.any(Function),
      );

      const config: Record<string, unknown> = {
        paymentOverride: 'someOverride',
      };
      setTransactionConfigMock.mock.calls[0][1](config);
      expect(config.paymentOverride).toBeUndefined();
    });

    it('does not call setTransactionConfig when no paymentOverride is active', () => {
      useSelectorMock.mockReturnValue(undefined);

      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        txParams: {},
      } as never);

      const setTransactionConfigMock = jest.mocked(
        Engine.context.TransactionPayController.setTransactionConfig,
      );

      const { result } = renderHook(() => usePayWithCryptoSection());

      act(() => {
        result.current?.rows[0].onPress?.();
      });

      expect(setPayTokenMock).toHaveBeenCalled();
      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });
  });

  describe('no-fee token row', () => {
    it('renders no-fee token row when noFeeToken is available', () => {
      const noFeeTokenMock = {
        address: '0xnoFee' as Hex,
        chainId: '0x1' as Hex,
        symbol: 'USDT',
        balanceUsd: '10',
      };
      isNoFeeTokenSharedMock.mockReturnValue(true);
      usePayWithNoFeeTokenMock.mockReturnValue({
        noFeeToken: noFeeTokenMock,
        isNoFeeToken: isNoFeeTokenSharedMock,
        renderNoFeeTag: jest.fn().mockReturnValue(null),
        renderNoFeeTagForToken: renderNoFeeTagForTokenSharedMock,
      });

      const { result } = renderHook(() => usePayWithCryptoSection());

      expect(result.current?.rows).toHaveLength(3);
      const noFeeRow = result.current?.rows.find(
        (row) => row.id === 'crypto-no-fee-token',
      );
      expect(noFeeRow).toEqual(
        expect.objectContaining({
          id: 'crypto-no-fee-token',
          title: 'USDT',
          testID: 'pay-with-crypto-section-no-fee-token-row',
        }),
      );
      expect(hasTag(noFeeRow, NO_FEE_TAG_SENTINEL)).toBe(true);
    });

    it('does not render no-fee token row when noFeeToken is undefined', () => {
      usePayWithNoFeeTokenMock.mockReturnValue({
        noFeeToken: undefined,
        isNoFeeToken: isNoFeeTokenSharedMock,
        renderNoFeeTag: jest.fn().mockReturnValue(null),
        renderNoFeeTagForToken: renderNoFeeTagForTokenSharedMock,
      });

      const { result } = renderHook(() => usePayWithCryptoSection());

      expect(result.current?.rows).toHaveLength(2);
      const noFeeRow = result.current?.rows.find(
        (row) => row.id === 'crypto-no-fee-token',
      );
      expect(noFeeRow).toBeUndefined();
    });

    it('does not render no-fee row or tags in withdraw flows', () => {
      const noFeeTokenMock = {
        address: '0xnoFee' as Hex,
        chainId: '0x1' as Hex,
        symbol: 'USDT',
        balanceUsd: '10',
      };
      isNoFeeTokenSharedMock.mockReturnValue(true);
      usePayWithNoFeeTokenMock.mockReturnValue({
        noFeeToken: noFeeTokenMock,
        isNoFeeToken: isNoFeeTokenSharedMock,
        renderNoFeeTag: jest.fn().mockReturnValue(null),
        renderNoFeeTagForToken: renderNoFeeTagForTokenSharedMock,
      });
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.perpsWithdraw,
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePayWithCryptoSection());

      expect(
        result.current?.rows.find((row) => row.id === 'crypto-no-fee-token'),
      ).toBeUndefined();
      for (const row of result.current?.rows ?? []) {
        if (row.id === 'crypto-other-assets') continue;
        expect(hasTag(row, NO_FEE_TAG_SENTINEL)).toBe(false);
      }
    });

    it('shows no-fee tags on token rows but keeps the suggestion row suppressed for Money withdrawals', () => {
      isNoFeeTokenSharedMock.mockImplementation(
        (address: string, chainId: string) =>
          address === TOKEN_MOCK.address && chainId === TOKEN_MOCK.chainId,
      );
      usePayWithNoFeeTokenMock.mockReturnValue({
        noFeeToken: {
          address: '0xnoFee' as Hex,
          chainId: '0x1' as Hex,
          symbol: 'USDT',
          balanceUsd: '10',
        },
        isNoFeeToken: isNoFeeTokenSharedMock,
        renderNoFeeTag: jest.fn().mockReturnValue(null),
        renderNoFeeTagForToken: renderNoFeeTagForTokenSharedMock,
      });
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountWithdraw,
        txParams: {},
      } as never);

      const { result } = renderHook(() => usePayWithCryptoSection());

      // Dedicated "pay-with" no-fee suggestion row stays suppressed on withdraw.
      expect(
        result.current?.rows.find((row) => row.id === 'crypto-no-fee-token'),
      ).toBeUndefined();
      // The destination token row still shows its no-fee tag.
      const preferredRow = result.current?.rows.find(
        (row) => row.id === 'crypto-preferred-token',
      );
      expect(hasTag(preferredRow, NO_FEE_TAG_SENTINEL)).toBe(true);
    });

    it('renders the no-fee tag on the preferred row when it is a no-fee token', () => {
      isNoFeeTokenSharedMock.mockImplementation(
        (address: string, chainId: string) =>
          address === TOKEN_MOCK.address && chainId === TOKEN_MOCK.chainId,
      );

      const { result } = renderHook(() => usePayWithCryptoSection());

      const preferredRow = result.current?.rows.find(
        (row) => row.id === 'crypto-preferred-token',
      );
      expect(hasTag(preferredRow, NO_FEE_TAG_SENTINEL)).toBe(true);
    });

    it('sorts token rows by balance descending', () => {
      const noFeeTokenMock = {
        address: '0xnoFee' as Hex,
        chainId: '0x1' as Hex,
        symbol: 'USDT',
        balanceUsd: '15',
      };
      usePayWithNoFeeTokenMock.mockReturnValue({
        noFeeToken: noFeeTokenMock,
        isNoFeeToken: isNoFeeTokenSharedMock,
        renderNoFeeTag: jest.fn().mockReturnValue(null),
        renderNoFeeTagForToken: renderNoFeeTagForTokenSharedMock,
      });
      usePayWithPreferredTokenMock.mockReturnValue({
        hasTokens: true,
        preferredToken: {
          ...TOKEN_MOCK,
          balanceUsd: '5',
        },
        selectedToken: {
          ...TOKEN_MOCK,
          balanceUsd: '5',
        },
      });

      const { result } = renderHook(() => usePayWithCryptoSection());

      expect(result.current?.rows).toHaveLength(3);
      expect(result.current?.rows[0].id).toBe('crypto-no-fee-token');
      expect(result.current?.rows[1].id).toBe('crypto-preferred-token');
      expect(result.current?.rows[2].id).toBe('crypto-other-assets');
    });

    it('pressing the no-fee token row calls setPayToken and navigates back', () => {
      const noFeeTokenMock = {
        address: '0xnoFee' as Hex,
        chainId: '0x1' as Hex,
        symbol: 'USDT',
        balanceUsd: '10',
      };
      usePayWithNoFeeTokenMock.mockReturnValue({
        noFeeToken: noFeeTokenMock,
        isNoFeeToken: isNoFeeTokenSharedMock,
        renderNoFeeTag: jest.fn().mockReturnValue(null),
        renderNoFeeTagForToken: renderNoFeeTagForTokenSharedMock,
      });

      const { result } = renderHook(() => usePayWithCryptoSection());

      const noFeeRow = result.current?.rows.find(
        (row) => row.id === 'crypto-no-fee-token',
      );

      act(() => {
        noFeeRow?.onPress?.();
      });

      expect(setPayTokenMock).toHaveBeenCalledWith({
        address: noFeeTokenMock.address,
        chainId: noFeeTokenMock.chainId,
      });
      expect(goBackMock).toHaveBeenCalledTimes(1);
    });

    it('does not render no-fee token row when it duplicates the selected token', () => {
      const noFeeTokenMock = {
        address: SELECTED_TOKEN_MOCK.address,
        chainId: SELECTED_TOKEN_MOCK.chainId,
        symbol: SELECTED_TOKEN_MOCK.symbol,
        balanceUsd: SELECTED_TOKEN_MOCK.balanceUsd,
      };
      usePayWithNoFeeTokenMock.mockReturnValue({
        noFeeToken: noFeeTokenMock,
        isNoFeeToken: isNoFeeTokenSharedMock,
        renderNoFeeTag: jest.fn().mockReturnValue(null),
        renderNoFeeTagForToken: renderNoFeeTagForTokenSharedMock,
      });
      usePayWithSelectedTokenMock.mockReturnValue({
        isSelectedDistinctFromAutomatic: true,
        selectedToken: SELECTED_TOKEN_MOCK,
        selectToken: selectTokenMock,
      });

      const { result } = renderHook(() => usePayWithCryptoSection());

      const noFeeRow = result.current?.rows.find(
        (row) => row.id === 'crypto-no-fee-token',
      );
      expect(noFeeRow).toBeUndefined();
    });

    it('renders the no-fee tag on the selected row when it is a no-fee token', () => {
      isNoFeeTokenSharedMock.mockImplementation(
        (address: string, chainId: string) =>
          address === SELECTED_TOKEN_MOCK.address &&
          chainId === SELECTED_TOKEN_MOCK.chainId,
      );
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
      expect(hasTag(selectedRow, NO_FEE_TAG_SENTINEL)).toBe(true);
    });
  });
});
