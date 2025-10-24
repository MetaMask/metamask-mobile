import { renderHook } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import { CardSDK } from '../sdk/CardSDK';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

const createMockSDK = (isBaanxLoginEnabled: boolean): Partial<CardSDK> => ({
  get isBaanxLoginEnabled() {
    return isBaanxLoginEnabled;
  },
  get isCardEnabled() {
    return true;
  },
  isCardHolder: jest.fn(),
  getGeoLocation: jest.fn(),
  getSupportedTokensAllowances: jest.fn(),
  getPriorityToken: jest.fn(),
});

const mockCardSDKResponse = (sdk: Partial<CardSDK> | null) => {
  mockUseCardSDK.mockReturnValue({
    sdk: sdk as CardSDK | null,
    isLoading: false,
    user: null,
    setUser: jest.fn(),
    logoutFromProvider: jest.fn(),
  });
};

describe('useIsBaanxLoginEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when SDK is null', () => {
    // Given: SDK is not available
    mockCardSDKResponse(null);

    // When: hook is rendered
    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    // Then: should return false
    expect(result.current).toBe(false);
  });

  it('returns true when Baanx login is enabled', () => {
    // Given: SDK with Baanx login enabled
    mockCardSDKResponse(createMockSDK(true));

    // When: hook is rendered
    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    // Then: should return true
    expect(result.current).toBe(true);
  });

  it('returns false when Baanx login is disabled', () => {
    // Given: SDK with Baanx login disabled
    mockCardSDKResponse(createMockSDK(false));

    // When: hook is rendered
    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    // Then: should return false
    expect(result.current).toBe(false);
  });

  it('updates when SDK value changes', () => {
    // Given: SDK with Baanx login disabled
    mockCardSDKResponse(createMockSDK(false));
    const { result, rerender } = renderHook(() => useIsBaanxLoginEnabled());

    // Then: should return false initially
    expect(result.current).toBe(false);

    // When: SDK changes to enable Baanx login
    mockCardSDKResponse(createMockSDK(true));
    rerender();

    // Then: should return true
    expect(result.current).toBe(true);
  });
});
