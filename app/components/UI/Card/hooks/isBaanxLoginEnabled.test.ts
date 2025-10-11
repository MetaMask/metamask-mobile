import { renderHook } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import { CardSDK } from '../sdk/CardSDK';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('useIsBaanxLoginEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when SDK is null', () => {
    mockUseCardSDK.mockReturnValue({
      sdk: null,
      isAuthenticated: false,
      setIsAuthenticated: jest.fn(),
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
    expect(mockUseCardSDK).toHaveBeenCalledTimes(1);
  });

  it('should return false when SDK is undefined', () => {
    mockUseCardSDK.mockReturnValue({
      sdk: null,
      isAuthenticated: false,
      setIsAuthenticated: jest.fn(),
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
    expect(mockUseCardSDK).toHaveBeenCalledTimes(1);
  });

  it('should return true when SDK exists and isBaanxLoginEnabled is true', () => {
    const mockSdk = {
      get isBaanxLoginEnabled() {
        return true;
      },
      get isCardEnabled() {
        return true;
      },
      get supportedTokens() {
        return [];
      },
      isCardHolder: jest.fn(),
      getGeoLocation: jest.fn(),
      getSupportedTokensAllowances: jest.fn(),
      getPriorityToken: jest.fn(),
    };

    mockUseCardSDK.mockReturnValue({
      sdk: mockSdk as unknown as CardSDK,
      isAuthenticated: false,
      setIsAuthenticated: jest.fn(),
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(true);
    expect(mockUseCardSDK).toHaveBeenCalledTimes(1);
  });

  it('should return false when SDK exists and isBaanxLoginEnabled is false', () => {
    const mockSdk = {
      get isBaanxLoginEnabled() {
        return false;
      },
      get isCardEnabled() {
        return true;
      },
      get supportedTokens() {
        return [];
      },
      isCardHolder: jest.fn(),
      getGeoLocation: jest.fn(),
      getSupportedTokensAllowances: jest.fn(),
      getPriorityToken: jest.fn(),
    };

    mockUseCardSDK.mockReturnValue({
      sdk: mockSdk as unknown as CardSDK,
      isAuthenticated: false,
      setIsAuthenticated: jest.fn(),
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
    expect(mockUseCardSDK).toHaveBeenCalledTimes(1);
  });

  it('should call useCardSDK hook correctly', () => {
    const mockSdk = {
      get isBaanxLoginEnabled() {
        return true;
      },
      get isCardEnabled() {
        return true;
      },
      get supportedTokens() {
        return [];
      },
      isCardHolder: jest.fn(),
      getGeoLocation: jest.fn(),
      getSupportedTokensAllowances: jest.fn(),
      getPriorityToken: jest.fn(),
    };

    mockUseCardSDK.mockReturnValue({
      sdk: mockSdk as unknown as CardSDK,
      isAuthenticated: false,
      setIsAuthenticated: jest.fn(),
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
    });

    renderHook(() => useIsBaanxLoginEnabled());

    expect(mockUseCardSDK).toHaveBeenCalledWith();
    expect(mockUseCardSDK).toHaveBeenCalledTimes(1);
  });

  it('should re-render when SDK value changes', () => {
    const mockSdk = {
      get isBaanxLoginEnabled() {
        return false;
      },
      get isCardEnabled() {
        return true;
      },
      get supportedTokens() {
        return [];
      },
      isCardHolder: jest.fn(),
      getGeoLocation: jest.fn(),
      getSupportedTokensAllowances: jest.fn(),
      getPriorityToken: jest.fn(),
    };

    mockUseCardSDK.mockReturnValue({
      sdk: mockSdk as unknown as CardSDK,
      isAuthenticated: false,
      setIsAuthenticated: jest.fn(),
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
    });

    const { result, rerender } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);

    const updatedMockSdk = {
      ...mockSdk,
      get isBaanxLoginEnabled() {
        return true;
      },
    };

    mockUseCardSDK.mockReturnValue({
      sdk: updatedMockSdk as unknown as CardSDK,
      isAuthenticated: false,
      setIsAuthenticated: jest.fn(),
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
    });

    rerender();

    expect(result.current).toBe(true);
  });
});
