import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useTransakController } from './useTransakController';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

const mockGetProviderToken = jest.fn();
const mockStoreProviderToken = jest.fn();
const mockResetProviderToken = jest.fn();

jest.mock('../Deposit/utils/ProviderTokenVault', () => ({
  getProviderToken: (...args: unknown[]) => mockGetProviderToken(...args),
  storeProviderToken: (...args: unknown[]) => mockStoreProviderToken(...args),
  resetProviderToken: (...args: unknown[]) => mockResetProviderToken(...args),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      transakSetApiKey: jest.fn(),
      transakSetAccessToken: jest.fn(),
      transakClearAccessToken: jest.fn(),
      transakLogout: jest.fn().mockResolvedValue(undefined),
      transakSendUserOtp: jest.fn(),
      transakVerifyUserOtp: jest.fn(),
      transakGetUserDetails: jest.fn(),
      transakGetBuyQuote: jest.fn(),
      transakGetKycRequirement: jest.fn(),
      transakGetAdditionalRequirements: jest.fn(),
      transakCreateOrder: jest.fn(),
      transakGetOrder: jest.fn(),
      transakGetUserLimits: jest.fn(),
      transakRequestOtt: jest.fn(),
      transakGeneratePaymentWidgetUrl: jest.fn(),
      transakSubmitPurposeOfUsageForm: jest.fn(),
      transakPatchUser: jest.fn(),
      transakSubmitSsnDetails: jest.fn(),
      transakConfirmPayment: jest.fn(),
      transakGetTranslation: jest.fn(),
      transakGetIdProofStatus: jest.fn(),
      transakCancelOrder: jest.fn(),
      transakCancelAllActiveOrders: jest.fn(),
      transakGetActiveOrders: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/deposit', () => ({
  selectDepositProviderApiKey: () => 'test-api-key',
}));

const mockTransakState = {
  isAuthenticated: false,
  userDetails: { data: null, isLoading: false, error: null },
  buyQuote: { data: null, isLoading: false, error: null },
  kycRequirement: { data: null, isLoading: false, error: null },
};

const mockUserRegion = {
  country: {
    isoCode: 'US',
    name: 'United States',
    flag: '🇺🇸',
    phone: {
      prefix: '+1',
      placeholder: '(XXX) XXX-XXXX',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'USD',
    supported: { buy: true, sell: true },
  },
  state: { stateId: 'CA', name: 'California' },
  regionCode: 'us-ca',
};

const mockPaymentMethod = {
  id: '/payments/debit-credit-card',
  paymentType: 'debit-credit-card',
  name: 'Debit/Credit Card',
  score: 100,
  icon: 'card',
};

const createMockStore = (overrides = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion: mockUserRegion,
            paymentMethods: {
              data: [mockPaymentMethod],
              selected: mockPaymentMethod,
              isLoading: false,
              error: null,
            },
            nativeProviders: {
              transak: mockTransakState,
            },
            ...overrides,
          },
        },
      }),
    },
  });

const createWrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

const getRampsController = () => Engine.context.RampsController;

describe('useTransakController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns expected properties from transak state', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toMatchObject({
        transak: mockTransakState,
        isAuthenticated: false,
        userDetails: null,
        userDetailsLoading: false,
        userDetailsError: null,
        buyQuote: null,
        buyQuoteLoading: false,
        buyQuoteError: null,
        kycRequirement: null,
        kycRequirementLoading: false,
        kycRequirementError: null,
        userRegion: mockUserRegion,
        selectedPaymentMethod: mockPaymentMethod,
      });
    });

    it('returns all expected functions', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      expect(typeof result.current.checkExistingToken).toBe('function');
      expect(typeof result.current.setAuthToken).toBe('function');
      expect(typeof result.current.logoutFromProvider).toBe('function');
      expect(typeof result.current.sendUserOtp).toBe('function');
      expect(typeof result.current.verifyUserOtp).toBe('function');
      expect(typeof result.current.getUserDetails).toBe('function');
      expect(typeof result.current.getBuyQuote).toBe('function');
      expect(typeof result.current.getKycRequirement).toBe('function');
      expect(typeof result.current.getAdditionalRequirements).toBe('function');
      expect(typeof result.current.createOrder).toBe('function');
      expect(typeof result.current.getOrder).toBe('function');
      expect(typeof result.current.getUserLimits).toBe('function');
      expect(typeof result.current.requestOtt).toBe('function');
      expect(typeof result.current.generatePaymentWidgetUrl).toBe('function');
      expect(typeof result.current.submitPurposeOfUsageForm).toBe('function');
      expect(typeof result.current.patchUser).toBe('function');
      expect(typeof result.current.submitSsnDetails).toBe('function');
      expect(typeof result.current.confirmPayment).toBe('function');
      expect(typeof result.current.getTranslation).toBe('function');
      expect(typeof result.current.getIdProofStatus).toBe('function');
      expect(typeof result.current.cancelOrder).toBe('function');
      expect(typeof result.current.cancelAllActiveOrders).toBe('function');
      expect(typeof result.current.getActiveOrders).toBe('function');
    });
  });

  describe('API key initialization', () => {
    it('sets the API key on mount when providerApiKey is available', () => {
      const store = createMockStore();
      renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      expect(getRampsController().transakSetApiKey).toHaveBeenCalledWith(
        'test-api-key',
      );
    });
  });

  describe('checkExistingToken', () => {
    it('returns true and sets token when a valid token exists', async () => {
      mockGetProviderToken.mockResolvedValue({
        success: true,
        token: { accessToken: 'valid-token', ttl: 3600 },
      });

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let tokenExists = false;
      await act(async () => {
        tokenExists = await result.current.checkExistingToken();
      });

      expect(tokenExists).toBe(true);
      expect(getRampsController().transakSetAccessToken).toHaveBeenCalledWith({
        accessToken: 'valid-token',
        ttl: 3600,
      });
    });

    it('returns false when no valid token exists', async () => {
      mockGetProviderToken.mockResolvedValue({ success: false });

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let tokenExists = true;
      await act(async () => {
        tokenExists = await result.current.checkExistingToken();
      });

      expect(tokenExists).toBe(false);
      expect(getRampsController().transakSetAccessToken).not.toHaveBeenCalled();
    });

    it('returns false and logs error on exception', async () => {
      mockGetProviderToken.mockRejectedValue(new Error('Keychain error'));

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let tokenExists = true;
      await act(async () => {
        tokenExists = await result.current.checkExistingToken();
      });

      expect(tokenExists).toBe(false);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('setAuthToken', () => {
    it('stores token and sets it on the controller when successful', async () => {
      const token = { accessToken: 'new-token', ttl: 3600 };
      mockStoreProviderToken.mockResolvedValue({ success: true });

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let success = false;
      await act(async () => {
        success = await result.current.setAuthToken(token as never);
      });

      expect(success).toBe(true);
      expect(mockStoreProviderToken).toHaveBeenCalledWith(token);
      expect(getRampsController().transakSetAccessToken).toHaveBeenCalledWith(
        token,
      );
    });

    it('returns false when store fails', async () => {
      const token = { accessToken: 'new-token', ttl: 3600 };
      mockStoreProviderToken.mockResolvedValue({ success: false });

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let success = true;
      await act(async () => {
        success = await result.current.setAuthToken(token as never);
      });

      expect(success).toBe(false);
    });

    it('returns false and logs error on exception', async () => {
      const token = { accessToken: 'new-token', ttl: 3600 };
      mockStoreProviderToken.mockRejectedValue(new Error('Store error'));

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let success = true;
      await act(async () => {
        success = await result.current.setAuthToken(token as never);
      });

      expect(success).toBe(false);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('logoutFromProvider', () => {
    it('calls transakLogout, resets token, and clears access token', async () => {
      mockResetProviderToken.mockResolvedValue(undefined);

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.logoutFromProvider();
      });

      expect(getRampsController().transakLogout).toHaveBeenCalled();
      expect(mockResetProviderToken).toHaveBeenCalled();
      expect(getRampsController().transakClearAccessToken).toHaveBeenCalled();
    });

    it('fires and forgets logout when requireServerInvalidation is false', async () => {
      mockResetProviderToken.mockResolvedValue(undefined);

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.logoutFromProvider(false);
      });

      expect(getRampsController().transakLogout).toHaveBeenCalled();
      expect(mockResetProviderToken).toHaveBeenCalled();
      expect(getRampsController().transakClearAccessToken).toHaveBeenCalled();
    });
  });

  describe('verifyUserOtp', () => {
    it('verifies OTP and stores the returned token', async () => {
      const mockToken = { accessToken: 'otp-token', ttl: 3600 };
      (
        getRampsController().transakVerifyUserOtp as jest.Mock
      ).mockResolvedValue(mockToken);
      mockStoreProviderToken.mockResolvedValue({ success: true });

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let token: unknown;
      await act(async () => {
        token = await result.current.verifyUserOtp(
          'test@example.com',
          '123456',
          'state-token',
        );
      });

      expect(token).toEqual(mockToken);
      expect(mockStoreProviderToken).toHaveBeenCalledWith(mockToken);
    });
  });

  describe('controller method delegates', () => {
    it('sendUserOtp delegates to RampsController', async () => {
      const mockResponse = {
        isTncAccepted: true,
        stateToken: 'tok',
        email: 'test@test.com',
        expiresIn: 300,
      };
      (getRampsController().transakSendUserOtp as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let response: unknown;
      await act(async () => {
        response = await result.current.sendUserOtp('test@test.com');
      });

      expect(getRampsController().transakSendUserOtp).toHaveBeenCalledWith(
        'test@test.com',
      );
      expect(response).toEqual(mockResponse);
    });

    it('getUserDetails delegates to RampsController', async () => {
      const mockDetails = { firstName: 'John', lastName: 'Doe' };
      (
        getRampsController().transakGetUserDetails as jest.Mock
      ).mockResolvedValue(mockDetails);

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let details: unknown;
      await act(async () => {
        details = await result.current.getUserDetails();
      });

      expect(details).toEqual(mockDetails);
    });

    it('getBuyQuote delegates to RampsController with correct arguments', async () => {
      const mockQuote = { quoteId: 'q1', fiatAmount: 100 };
      (getRampsController().transakGetBuyQuote as jest.Mock).mockResolvedValue(
        mockQuote,
      );

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let quote: unknown;
      await act(async () => {
        quote = await result.current.getBuyQuote(
          'USD',
          'ETH',
          'ethereum',
          'card',
          '100',
        );
      });

      expect(getRampsController().transakGetBuyQuote).toHaveBeenCalledWith(
        'USD',
        'ETH',
        'ethereum',
        'card',
        '100',
      );
      expect(quote).toEqual(mockQuote);
    });

    it('createOrder delegates to RampsController', async () => {
      const mockOrder = { id: 'order-1' };
      (getRampsController().transakCreateOrder as jest.Mock).mockResolvedValue(
        mockOrder,
      );

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let order: unknown;
      await act(async () => {
        order = await result.current.createOrder('q1', '0xabc', 'pm-1');
      });

      expect(getRampsController().transakCreateOrder).toHaveBeenCalledWith(
        'q1',
        '0xabc',
        'pm-1',
      );
      expect(order).toEqual(mockOrder);
    });

    it('cancelOrder delegates to RampsController', async () => {
      (getRampsController().transakCancelOrder as jest.Mock).mockResolvedValue(
        undefined,
      );

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.cancelOrder('order-1');
      });

      expect(getRampsController().transakCancelOrder).toHaveBeenCalledWith(
        'order-1',
      );
    });

    it('getActiveOrders delegates to RampsController', async () => {
      const mockOrders = [{ id: 'order-1' }, { id: 'order-2' }];
      (
        getRampsController().transakGetActiveOrders as jest.Mock
      ).mockResolvedValue(mockOrders);

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let orders: unknown;
      await act(async () => {
        orders = await result.current.getActiveOrders();
      });

      expect(orders).toEqual(mockOrders);
    });

    it('confirmPayment delegates to RampsController', async () => {
      (
        getRampsController().transakConfirmPayment as jest.Mock
      ).mockResolvedValue({ success: true });

      const store = createMockStore();
      const { result } = renderHook(() => useTransakController(), {
        wrapper: createWrapper(store),
      });

      let response: unknown;
      await act(async () => {
        response = await result.current.confirmPayment('order-1', 'pm-1');
      });

      expect(getRampsController().transakConfirmPayment).toHaveBeenCalledWith(
        'order-1',
        'pm-1',
      );
      expect(response).toEqual({ success: true });
    });
  });
});
