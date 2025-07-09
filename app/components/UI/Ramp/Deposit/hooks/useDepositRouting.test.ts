import { AxiosError } from 'axios';
import { renderHook } from '@testing-library/react-hooks';
import { useDepositRouting } from './useDepositRouting';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { SEPA_PAYMENT_METHOD } from '../constants';
import useHandleNewOrder from './useHandleNewOrder';

// Mock React Navigation at the module level to allow navigation detail creators to be imported
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('@react-navigation/compat', () => ({
  withNavigation: jest.fn((component) => component),
}));

const mockUseDepositSdkMethodInitialState = {
  data: null,
  error: null as string | null,
  isFetching: false,
};

let mockFetchKycForms = jest.fn().mockResolvedValue({ forms: [] });
let mockFetchKycFormData = jest
  .fn()
  .mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } });
let mockFetchUserDetails = jest
  .fn()
  .mockResolvedValue({ kyc: { l1: { status: 'APPROVED' } } });
let mockCreateReservation = jest
  .fn()
  .mockResolvedValue({ id: 'reservation-id' });
let mockCreateOrder = jest
  .fn()
  .mockResolvedValue({ id: 'order-id', walletAddress: '0x123' });
let mockSubmitPurposeOfUsage = jest.fn().mockResolvedValue(undefined);

const mockNavigate = jest.fn();

jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn((config) => {
    if (config?.method === 'getKYCForms') {
      return [mockUseDepositSdkMethodInitialState, mockFetchKycForms];
    }
    if (config?.method === 'getKycForm') {
      return [mockUseDepositSdkMethodInitialState, mockFetchKycFormData];
    }
    if (config?.method === 'getUserDetails') {
      return [mockUseDepositSdkMethodInitialState, mockFetchUserDetails];
    }
    if (config?.method === 'walletReserve') {
      return [mockUseDepositSdkMethodInitialState, mockCreateReservation];
    }
    if (config?.method === 'createOrder') {
      return [mockUseDepositSdkMethodInitialState, mockCreateOrder];
    }
    if (config?.method === 'submitPurposeOfUsageForm') {
      return [mockUseDepositSdkMethodInitialState, mockSubmitPurposeOfUsage];
    }
    return [mockUseDepositSdkMethodInitialState, jest.fn()];
  }),
}));

const mockClearAuthToken = jest.fn();

jest.mock('../sdk', () => ({
  useDepositSDK: jest.fn(() => ({
    selectedRegion: { isoCode: 'US' },
    clearAuthToken: mockClearAuthToken,
  })),
}));

jest.mock('./useHandleNewOrder');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../orderProcessor', () => ({
  depositOrderToFiatOrder: jest.fn((order) => order),
}));

jest.mock('../constants', () => ({
  SEPA_PAYMENT_METHOD: { id: 'sepa' },
}));

const mockUseHandleNewOrder = jest.mocked(useHandleNewOrder);

describe('useDepositRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchKycForms = jest.fn().mockResolvedValue({ forms: [] });
    mockFetchKycFormData = jest
      .fn()
      .mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } });
    mockFetchUserDetails = jest
      .fn()
      .mockResolvedValue({ kyc: { l1: { status: 'APPROVED' } } });
    mockCreateReservation = jest
      .fn()
      .mockResolvedValue({ id: 'reservation-id' });
    mockCreateOrder = jest
      .fn()
      .mockResolvedValue({ id: 'order-id', walletAddress: '0x123' });
    mockSubmitPurposeOfUsage = jest.fn().mockResolvedValue(undefined);

    mockUseHandleNewOrder.mockReturnValue(
      jest.fn().mockResolvedValue(undefined),
    );
  });

  it('should create the hook with correct parameters', () => {
    const mockParams = {
      selectedWalletAddress: '0x123',
      cryptoCurrencyChainId: 'eip155:1',
      paymentMethodId: SEPA_PAYMENT_METHOD.id,
    };

    const { result } = renderHook(() => useDepositRouting(mockParams));

    expect(result.current.routeAfterAuthentication).toBeDefined();
    expect(typeof result.current.routeAfterAuthentication).toBe('function');
  });

  describe('SEPA payment method routing', () => {
    it('should navigate to BankDetails when SEPA payment method is used and KYC is approved', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: SEPA_PAYMENT_METHOD.id,
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchUserDetails).toHaveBeenCalled();
      expect(mockCreateReservation).toHaveBeenCalledWith(mockQuote, '0x123');
      expect(mockCreateOrder).toHaveBeenCalledWith({ id: 'reservation-id' });
      expect(mockNavigate).toHaveBeenCalledWith('BankDetails', {
        orderId: 'order-id',
        shouldUpdate: false,
      });
    });

    it('should throw error when SEPA reservation fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: SEPA_PAYMENT_METHOD.id,
      };

      mockCreateReservation = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Missing reservation');
    });

    it('should throw error when SEPA order creation fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: SEPA_PAYMENT_METHOD.id,
      };
      mockCreateOrder = jest.fn().mockResolvedValue(null);
      const { result } = renderHook(() => useDepositRouting(mockParams));
      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Missing order');
    });
  });

  describe('KYC forms routing', () => {
    it('should navigate to BasicInfo when personalDetails form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'personalDetails' }, { id: 'idProof' }],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
        id: 'idProof',
      });
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        kycUrl: 'test-kyc-url',
      });
    });

    it('should navigate to BasicInfo when address form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'address' }, { id: 'idProof' }],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
        id: 'idProof',
      });
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        kycUrl: 'test-kyc-url',
      });
    });

    it('should navigate to BasicInfo when SSN form is required for US user', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'usSSN' }],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
        quote: mockQuote,
        kycUrl: undefined,
      });
    });

    it('should auto-submit purpose of usage form when it is the only remaining form', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest
        .fn()
        .mockResolvedValueOnce({
          forms: [{ id: 'purposeOfUsage' }],
        })
        .mockResolvedValueOnce({
          forms: [],
        });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockSubmitPurposeOfUsage).toHaveBeenCalledWith([
        'Buying/selling crypto for investments',
      ]);
      expect(mockFetchKycForms).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith('ProviderWebview', {
        quote: mockQuote,
      });
    });

    it('should navigate to KycWebview when only idProof form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'idProof' }],
      });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
        id: 'idProof',
      });
      expect(mockNavigate).toHaveBeenCalledWith('KycWebview', {
        quote: mockQuote,
        kycUrl: 'test-kyc-url',
      });
    });

    it('should throw error when idProof form exists but no form data is returned', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'idProof' }],
      });
      mockFetchKycFormData = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('An unexpected error occurred.');
    });
  });

  describe('User authentication and KYC status routing', () => {
    it('should navigate to ProviderWebview when user is authenticated, no forms required, and KYC is approved', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchUserDetails).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('ProviderWebview', {
        quote: mockQuote,
      });
    });

    it('should navigate to KycProcessing when user is authenticated, no forms required, but KYC is not approved', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchUserDetails = jest
        .fn()
        .mockResolvedValue({ kyc: { l1: { status: 'PENDING' } } });

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();

      expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      expect(mockFetchUserDetails).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('KycProcessing', {
        quote: mockQuote,
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error when user details are missing', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      mockFetchUserDetails = jest.fn().mockResolvedValue(null);
      const { result } = renderHook(() => useDepositRouting(mockParams));
      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('Missing user details');
    });

    it('should throw error when KYC forms fetch fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest
        .fn()
        .mockRejectedValue(new Error('KYC forms fetch failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('KYC forms fetch failed');
    });

    it('should throw error when KYC form data fetch fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchKycForms = jest.fn().mockResolvedValue({
        forms: [{ id: 'idProof' }],
      });
      mockFetchKycFormData = jest
        .fn()
        .mockRejectedValue(new Error('KYC form data fetch failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('KYC form data fetch failed');
    });

    it('should throw error when user details fetch fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockFetchUserDetails = jest
        .fn()
        .mockRejectedValue(new Error('User details fetch failed'));

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('User details fetch failed');
    });
  });

  describe('401 Unauthorized handling', () => {
    it('navigates to Login when user is unauthorized', async () => {
      const mockQuote = {} as BuyQuote;

      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };
      mockFetchKycForms = jest.fn().mockImplementation(() => {
        const error = new Error('Unauthorized');
        (error as AxiosError).status = 401;
        throw error;
      });
      const { result } = renderHook(() => useDepositRouting(mockParams));
      await result.current.routeAfterAuthentication(mockQuote);
      expect(mockClearAuthToken).toHaveBeenCalled();
      expect(mockNavigate.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "EnterEmail",
            {
              "cryptoCurrencyChainId": "eip155:1",
              "paymentMethodId": "credit_debit_card",
              "quote": {},
            },
          ],
        ]
      `);
    });
  });
});
