import { renderHook, act } from '@testing-library/react-native';
import useRampsQuickBuy from './useRampsQuickBuy';
import { useRampsController } from './useRampsController';
import { useRampNavigation } from './useRampNavigation';
import { registerQuickBuyErrorCallback } from '../utils/quickBuyCallbackRegistry';

jest.mock('./useRampsController', () => ({
  useRampsController: jest.fn(),
}));

jest.mock('./useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

jest.mock('../utils/quickBuyCallbackRegistry', () => ({
  registerQuickBuyErrorCallback: jest.fn(),
}));

const mockUseRampsController = useRampsController as jest.MockedFunction<
  typeof useRampsController
>;
const mockUseRampNavigation = useRampNavigation as jest.MockedFunction<
  typeof useRampNavigation
>;
const mockRegisterQuickBuyErrorCallback =
  registerQuickBuyErrorCallback as jest.MockedFunction<
    typeof registerQuickBuyErrorCallback
  >;

describe('useRampsQuickBuy', () => {
  const mockGoToBuy = jest.fn();
  const mockSetSelectedToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampNavigation.mockReturnValue({
      goToBuy: mockGoToBuy,
      goToAggregator: jest.fn(),
      goToSell: jest.fn(),
      goToDeposit: jest.fn(),
    });
    mockUseRampsController.mockReturnValue({
      userRegion: null,
      setUserRegion: jest.fn(),
      providers: [{ id: '/providers/transak', name: 'Transak' }] as never[],
      selectedProvider: { id: '/providers/transak', name: 'Transak' } as never,
      setSelectedProvider: jest.fn(),
      providersLoading: false,
      providersError: null,
      tokens: null,
      selectedToken: null,
      setSelectedToken: mockSetSelectedToken,
      tokensLoading: false,
      tokensError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [
        { id: '/payments/debit-credit-card', name: 'Card' },
        { id: '/payments/bank-transfer', name: 'Bank Transfer' },
      ] as never[],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      getQuotes: jest.fn(),
      getWidgetUrl: jest.fn(),
    });
    mockRegisterQuickBuyErrorCallback.mockReturnValue('quick-buy-callback-key');
  });

  it('sets selected token when assetId is provided', () => {
    renderHook(() =>
      useRampsQuickBuy({
        assetId: 'eip155:1/erc20:0x123',
        amount: '100',
      }),
    );

    expect(mockSetSelectedToken).toHaveBeenCalledWith('eip155:1/erc20:0x123');
  });

  it('returns payment options with deeplinks', () => {
    const { result } = renderHook(() =>
      useRampsQuickBuy({
        assetId: 'eip155:1/erc20:0x123',
        amount: '100',
      }),
    );

    expect(result.current.hasOptions).toBe(true);
    expect(result.current.paymentOptions).toHaveLength(2);
    expect(result.current.paymentOptions[0]).toEqual(
      expect.objectContaining({
        providerId: '/providers/transak',
        paymentMethodId: '/payments/debit-credit-card',
      }),
    );
    expect(result.current.paymentOptions[0].deeplink).toContain(
      'metamask://buy?',
    );
    expect(result.current.paymentOptions[0].deeplink).toContain(
      'autoProceed=true',
    );
  });

  it('calls goToBuy with autoProceed intent and callback key on option press', () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useRampsQuickBuy({
        assetId: 'eip155:1/erc20:0x123',
        amount: '100',
        onError,
      }),
    );

    act(() => {
      result.current.paymentOptions[0].onPress();
    });

    expect(mockRegisterQuickBuyErrorCallback).toHaveBeenCalledWith(onError);
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: 'eip155:1/erc20:0x123',
      amount: '100',
      providerId: '/providers/transak',
      paymentMethodId: '/payments/debit-credit-card',
      autoProceed: true,
      callbackKey: 'quick-buy-callback-key',
    });
  });
});
