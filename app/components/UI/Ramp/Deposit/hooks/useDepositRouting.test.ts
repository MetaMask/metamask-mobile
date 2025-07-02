import { renderHook } from '@testing-library/react-hooks';
import { useDepositRouting } from './useDepositRouting';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { SEPA_PAYMENT_METHOD } from '../constants';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import useHandleNewOrder from './useHandleNewOrder';

jest.mock('./useDepositSdkMethod');
jest.mock('./useHandleNewOrder');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../Views/KycProcessing/KycProcessing', () => ({
  createKycProcessingNavDetails: jest.fn(() => ['KycProcessing', {}]),
}));

jest.mock('../Views/ProviderWebview/ProviderWebview', () => ({
  createProviderWebviewNavDetails: jest.fn(() => ['ProviderWebview', {}]),
}));

jest.mock('../Views/BasicInfo/BasicInfo', () => ({
  createBasicInfoNavDetails: jest.fn(() => ['BasicInfo', {}]),
}));

jest.mock('../Views/KycWebview/KycWebview', () => ({
  createKycWebviewNavDetails: jest.fn(() => ['KycWebview', {}]),
}));

jest.mock('../Views/BankDetails/BankDetails', () => ({
  createBankDetailsNavDetails: jest.fn(() => ['BankDetails', {}]),
}));

jest.mock('../orderProcessor', () => ({
  depositOrderToFiatOrder: jest.fn((order) => order),
}));

jest.mock('../constants', () => ({
  SEPA_PAYMENT_METHOD: { id: 'sepa' },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

const mockUseDepositSdkMethod = jest.mocked(useDepositSdkMethod);
const mockUseHandleNewOrder = jest.mocked(useHandleNewOrder);

describe('useDepositRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create the hook with correct parameters', () => {
    const mockParams = {
      selectedWalletAddress: '0x123',
      cryptoCurrencyChainId: 'eip155:1',
      paymentMethodId: SEPA_PAYMENT_METHOD.id,
    };

    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: null, isFetching: false },
      jest.fn(),
    ]);

    mockUseHandleNewOrder.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useDepositRouting(mockParams));

    expect(result.current.routeAfterAuthentication).toBeDefined();
    expect(typeof result.current.routeAfterAuthentication).toBe('function');
  });

  describe('SEPA payment method routing', () => {
    it('should handle SEPA payment method routing correctly when KYC is approved', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: SEPA_PAYMENT_METHOD.id,
      };

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ forms: [] }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ kyc: { l1: { status: 'APPROVED' } } }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ id: 'reservation-id' }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ id: 'order-id', walletAddress: '0x123' }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn(),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn(),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();
    });

    it('should throw error when SEPA reservation fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: SEPA_PAYMENT_METHOD.id,
      };

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ forms: [] }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ kyc: { l1: { status: 'APPROVED' } } }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue(null),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('deposit.buildQuote.unexpectedError');
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

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({
            forms: [{ id: 'personalDetails' }, { id: 'idProof' }],
          }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } }),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();
    });

    it('should navigate to BasicInfo when address form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({
            forms: [{ id: 'address' }, { id: 'idProof' }],
          }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } }),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();
    });

    it('should navigate to KycWebview when only idProof form is required', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({
            forms: [{ id: 'idProof' }],
          }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } }),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();
    });

    it('should throw error when idProof form exists but no form data is returned', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({
            forms: [{ id: 'idProof' }],
          }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue(null),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('deposit.buildQuote.unexpectedError');
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

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ forms: [] }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ kyc: { l1: { status: 'APPROVED' } } }),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();
    });

    it('should navigate to KycProcessing when user is authenticated, no forms required, but KYC is not approved', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ forms: [] }),
        ])
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({ kyc: { l1: { status: 'PENDING' } } }),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).resolves.not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should throw error when KYC forms fetch fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: 'KYC forms fetch failed', isFetching: false },
          jest.fn().mockResolvedValue({ forms: [] }),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('deposit.buildQuote.unexpectedError');
    });



    it('should throw error when KYC form data fetch fails', async () => {
      const mockQuote = {} as BuyQuote;
      const mockParams = {
        selectedWalletAddress: '0x123',
        cryptoCurrencyChainId: 'eip155:1',
        paymentMethodId: 'credit_debit_card',
      };

      mockUseDepositSdkMethod
        .mockReturnValueOnce([
          { data: null, error: null, isFetching: false },
          jest.fn().mockResolvedValue({
            forms: [{ id: 'idProof' }],
          }),
        ])
        .mockReturnValueOnce([
          { data: null, error: 'KYC form data fetch failed', isFetching: false },
          jest.fn().mockResolvedValue({ data: { kycUrl: 'test-kyc-url' } }),
        ]);

      mockUseHandleNewOrder.mockReturnValue(
        jest.fn().mockResolvedValue(undefined),
      );

      const { result } = renderHook(() => useDepositRouting(mockParams));

      await expect(
        result.current.routeAfterAuthentication(mockQuote),
      ).rejects.toThrow('deposit.buildQuote.unexpectedError');
    });
  });
});
