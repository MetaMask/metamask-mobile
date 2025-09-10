import { renderHook } from '@testing-library/react-native';
import { usePaymentMethods } from './usePaymentMethods';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';

const mockPaymentMethods = [
  {
    id: 'credit_debit_card',
    name: 'Credit/Debit Card',
    iconName: 'card',
    duration: '2-5 minutes',
    fees: '3.99% + network fees',
  },
  {
    id: 'bank_transfer',
    name: 'Wire Transfer',
    iconName: 'bank',
    duration: '1-3 business days',
    fees: 'Network fees only',
  },
];

const mockUseDepositSdkMethod = jest.fn();
jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => mockUseDepositSdkMethod(),
}));

const mockUseDepositSDK = jest.fn();
jest.mock('../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

describe('usePaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: { isoCode: 'US', currency: 'USD' },
      selectedCryptoCurrency: { assetId: 'test-asset' },
      setSelectedPaymentMethod: jest.fn(),
      selectedPaymentMethod: null,
    });

    mockUseDepositSdkMethod.mockReturnValue([
      { data: mockPaymentMethods, error: null, isFetching: false },
      jest.fn(),
    ]);
  });

  it('returns payment methods from API', () => {
    const { result } = renderHook(() => usePaymentMethods());
    expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    expect(result.current.error).toBeNull();
    expect(result.current.isFetching).toBe(false);
  });

  it('returns loading state when fetching', () => {
    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: null, isFetching: true },
      jest.fn(),
    ]);

    const { result } = renderHook(() => usePaymentMethods());
    expect(result.current.paymentMethods).toBeNull();
    expect(result.current.isFetching).toBe(true);
  });

  it('returns error state when API fails', () => {
    const mockError = 'API Error';
    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: mockError, isFetching: false },
      jest.fn(),
    ]);

    const { result } = renderHook(() => usePaymentMethods());
    expect(result.current.paymentMethods).toBeNull();
    expect(result.current.error).toBe(mockError);
  });
});