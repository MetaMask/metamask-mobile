import { renderHook } from '@testing-library/react-hooks';
import { useGetSupportedTokens } from './useGetSupportedAssets';
import { useCardSDK } from '../sdk';
import { SupportedToken } from '../../../../selectors/featureFlagController/card';

// Mock the useCardSDK hook
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

describe('useGetSupportedTokens', () => {
  const mockSupportedTokens: SupportedToken[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      decimals: 18,
      enabled: true,
      name: 'Token A',
      symbol: 'TOKA',
    },
    {
      address: '0x0987654321098765432109876543210987654321',
      decimals: 6,
      enabled: true,
      name: 'Token B',
      symbol: 'TOKB',
    },
    {
      address: '0x1111111111111111111111111111111111111111',
      decimals: 8,
      enabled: false,
      name: 'Token C',
      symbol: 'TOKC',
    },
  ];

  const mockSDK = {
    supportedTokens: mockSupportedTokens,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty array when SDK is not available', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetSupportedTokens());

    expect(result.current.supportedTokens).toEqual([]);
  });

  it('should return supported tokens when SDK is available', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetSupportedTokens());

    expect(result.current.supportedTokens).toEqual(mockSupportedTokens);
    expect(result.current.supportedTokens).toHaveLength(3);
    expect(result.current.supportedTokens[0]).toEqual({
      address: '0x1234567890123456789012345678901234567890',
      decimals: 18,
      enabled: true,
      name: 'Token A',
      symbol: 'TOKA',
    });
  });

  it('should update supported tokens when SDK becomes available', () => {
    // Start with no SDK
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    const { result, rerender } = renderHook(() => useGetSupportedTokens());

    expect(result.current.supportedTokens).toEqual([]);

    // SDK becomes available
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    rerender();

    expect(result.current.supportedTokens).toEqual(mockSupportedTokens);
    expect(result.current.supportedTokens).toHaveLength(3);
  });

  it('should update supported tokens when SDK changes', () => {
    const newMockTokens: SupportedToken[] = [
      {
        address: '0x2222222222222222222222222222222222222222',
        decimals: 12,
        enabled: true,
        name: 'New Token',
        symbol: 'NTOK',
      },
    ];

    const newMockSDK = {
      supportedTokens: newMockTokens,
    };

    // Start with first SDK
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    const { result, rerender } = renderHook(() => useGetSupportedTokens());

    expect(result.current.supportedTokens).toEqual(mockSupportedTokens);

    // Change to new SDK with different tokens
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: newMockSDK });
    rerender();

    expect(result.current.supportedTokens).toEqual(newMockTokens);
    expect(result.current.supportedTokens).toHaveLength(1);
    expect(result.current.supportedTokens[0].symbol).toBe('NTOK');
  });

  it('should handle empty supported tokens array', () => {
    const emptyMockSDK = {
      supportedTokens: [],
    };

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: emptyMockSDK });

    const { result } = renderHook(() => useGetSupportedTokens());

    expect(result.current.supportedTokens).toEqual([]);
    expect(result.current.supportedTokens).toHaveLength(0);
  });

  it('should handle supported tokens with null/undefined values', () => {
    const tokenWithNullValues: SupportedToken[] = [
      {
        address: null,
        decimals: undefined,
        enabled: null,
        name: undefined,
        symbol: null,
      },
      {
        address: '0x3333333333333333333333333333333333333333',
        decimals: 18,
        enabled: true,
        name: 'Valid Token',
        symbol: 'VALID',
      },
    ];

    const nullValuesMockSDK = {
      supportedTokens: tokenWithNullValues,
    };

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: nullValuesMockSDK });

    const { result } = renderHook(() => useGetSupportedTokens());

    expect(result.current.supportedTokens).toEqual(tokenWithNullValues);
    expect(result.current.supportedTokens).toHaveLength(2);
    expect(result.current.supportedTokens[0].address).toBeNull();
    expect(result.current.supportedTokens[1].address).toBe(
      '0x3333333333333333333333333333333333333333',
    );
  });

  it('should not reset to empty array when SDK becomes unavailable', () => {
    // Start with SDK
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    const { result, rerender } = renderHook(() => useGetSupportedTokens());

    expect(result.current.supportedTokens).toEqual(mockSupportedTokens);

    // SDK becomes unavailable - tokens should remain (hook doesn't reset state)
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    rerender();

    expect(result.current.supportedTokens).toEqual(mockSupportedTokens);
  });

  it('should handle SDK with undefined supportedTokens property', () => {
    const sdkWithoutTokens = {};

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: sdkWithoutTokens });

    const { result } = renderHook(() => useGetSupportedTokens());

    // Should be undefined since SDK doesn't have supportedTokens property
    expect(result.current.supportedTokens).toBeUndefined();
  });

  it('should maintain referential stability when SDK does not change', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result, rerender } = renderHook(() => useGetSupportedTokens());

    const firstRender = result.current.supportedTokens;

    // Rerender without changing SDK
    rerender();

    const secondRender = result.current.supportedTokens;

    // Should be the same reference since SDK didn't change
    expect(firstRender).toBe(secondRender);
  });

  it('should filter and display only enabled tokens if needed', () => {
    // This test assumes the hook might be extended to filter enabled tokens
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetSupportedTokens());

    const enabledTokens = result.current.supportedTokens.filter(
      (token) => token.enabled,
    );

    expect(enabledTokens).toHaveLength(2);
    expect(enabledTokens.every((token) => token.enabled)).toBe(true);
    expect(enabledTokens.map((token) => token.symbol)).toEqual([
      'TOKA',
      'TOKB',
    ]);
  });

  it('should handle large numbers of supported tokens', () => {
    const largeMockTokens: SupportedToken[] = Array.from(
      { length: 100 },
      (_, i) => ({
        address: `0x${i.toString().padStart(40, '0')}`,
        decimals: 18,
        enabled: i % 2 === 0, // Alternate enabled/disabled
        name: `Token ${i}`,
        symbol: `TOK${i}`,
      }),
    );

    const largeMockSDK = {
      supportedTokens: largeMockTokens,
    };

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: largeMockSDK });

    const { result } = renderHook(() => useGetSupportedTokens());

    expect(result.current.supportedTokens).toHaveLength(100);
    expect(result.current.supportedTokens[0].symbol).toBe('TOK0');
    expect(result.current.supportedTokens[99].symbol).toBe('TOK99');

    // Check that enabled/disabled pattern is maintained
    expect(result.current.supportedTokens[0].enabled).toBe(true);
    expect(result.current.supportedTokens[1].enabled).toBe(false);
  });
});
