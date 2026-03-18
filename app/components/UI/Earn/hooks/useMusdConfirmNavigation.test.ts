import { act, renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { useMusdConfirmNavigation } from './useMusdConfirmNavigation';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { useTransactionPayIsMaxAmount } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { AssetType } from '../../../Views/confirmations/types/token';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock(
  '../../../Views/confirmations/hooks/pay/useTransactionPayData',
  () => ({
    useTransactionPayIsMaxAmount: jest.fn(),
  }),
);

jest.mock('./useMusdConversionTokens');

const mockUseTransactionPayIsMaxAmount =
  useTransactionPayIsMaxAmount as jest.MockedFunction<
    typeof useTransactionPayIsMaxAmount
  >;
const mockUseMusdConversionTokens =
  useMusdConversionTokens as jest.MockedFunction<
    typeof useMusdConversionTokens
  >;

const createTokenWithBalance = (
  overrides: Partial<AssetType> = {},
): AssetType =>
  ({
    address: '0xToken1',
    chainId: '0x1',
    symbol: 'USDC',
    rawBalance: '0x1000',
    ...overrides,
  }) as AssetType;

describe('useMusdConfirmNavigation', () => {
  const useSelectorMock = useSelector as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseTransactionPayIsMaxAmount.mockReturnValue(false);
    mockUseMusdConversionTokens.mockReturnValue({
      tokens: [
        createTokenWithBalance(),
        createTokenWithBalance({ address: '0xToken2', symbol: 'USDT' }),
      ],
      filterAllowedTokens: jest.fn(),
      isConversionToken: jest.fn(),
      isMusdSupportedOnChain: jest.fn(),
      hasConvertibleTokensByChainId: jest.fn(),
    });
  });

  it('goes back when quick convert is enabled and navigation can go back', () => {
    useSelectorMock.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(true);

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to wallet view when quick convert is enabled and cannot go back', () => {
    useSelectorMock.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(false);

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('navigates to wallet view when quick convert is disabled', () => {
    useSelectorMock.mockReturnValue(false);

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockCanGoBack).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('navigates to wallet view when max converting the last token', () => {
    useSelectorMock.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(true);
    mockUseTransactionPayIsMaxAmount.mockReturnValue(true);
    mockUseMusdConversionTokens.mockReturnValue({
      tokens: [createTokenWithBalance()],
      filterAllowedTokens: jest.fn(),
      isConversionToken: jest.fn(),
      isMusdSupportedOnChain: jest.fn(),
      hasConvertibleTokensByChainId: jest.fn(),
    });

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('goes back when max converting with multiple tokens remaining', () => {
    useSelectorMock.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(true);
    mockUseTransactionPayIsMaxAmount.mockReturnValue(true);

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('goes back when custom converting the last token with partial amount', () => {
    useSelectorMock.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(true);
    mockUseTransactionPayIsMaxAmount.mockReturnValue(false);
    mockUseMusdConversionTokens.mockReturnValue({
      tokens: [createTokenWithBalance()],
      filterAllowedTokens: jest.fn(),
      isConversionToken: jest.fn(),
      isMusdSupportedOnChain: jest.fn(),
      hasConvertibleTokensByChainId: jest.fn(),
    });

    const { result } = renderHook(() => useMusdConfirmNavigation());

    act(() => {
      result.current.navigateOnConfirm();
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
