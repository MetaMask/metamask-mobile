import { renderHook, act } from '@testing-library/react-hooks';
import { useGetAllowances } from './useGetAllowances';
import { useCardSDK } from '../sdk';
import { AllowanceState, CardTokenAllowance } from '../types';
import { ARBITRARY_ALLOWANCE } from '../constants';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useGetAllowances', () => {
  const mockGetSupportedTokensAllowances = jest.fn();
  const mockSupportedTokens = [
    {
      address: '0xToken1',
      symbol: 'TKN1',
      name: 'Token 1',
      decimals: 18,
    },
    {
      address: '0xToken2',
      symbol: 'TKN2',
      name: 'Token 2',
      decimals: 6,
    },
    {
      address: '0xToken3',
      symbol: 'TKN3',
      name: 'Token 3',
      decimals: 18,
    },
    {
      address: '0xToken4',
      symbol: 'TKN4',
      name: 'Token 4',
      decimals: 8,
    },
    {
      address: '0xToken5',
      symbol: 'TKN5',
      name: 'Token 5',
      decimals: 18,
    },
    {
      address: '0xToken6',
      symbol: 'TKN6',
      name: 'Token 6',
      decimals: 18,
    },
  ];
  const mockSDK = {
    getSupportedTokensAllowances: mockGetSupportedTokensAllowances,
    supportedTokens: mockSupportedTokens,
  };

  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockChainId = '0x1';

  const createMockToken = (
    address: string,
    usAllowance: string,
    globalAllowance: string,
  ) => ({
    address: address as `0x${string}`,
    usAllowance: {
      isZero: () => usAllowance === '0',
      lt: (other: number) => Number(usAllowance) < other,
      toString: () => usAllowance,
    },
    globalAllowance: {
      isZero: () => globalAllowance === '0',
      lt: (other: number) => Number(globalAllowance) < other,
      toString: () => globalAllowance,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedTokensAllowances.mockReset();
    (useSelector as jest.Mock).mockImplementation(() => mockChainId);
  });

  it('should return fetchAllowances function', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    expect(typeof result.current.fetchAllowances).toBe('function');
  });

  it('should fetch allowances successfully', async () => {
    const mockTokens = [
      createMockToken('0xToken1', '0', '1000000000000'),
      createMockToken('0xToken2', '500000', '0'),
      createMockToken('0xToken3', '0', '0'),
    ];

    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    let allowances: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances = await result.current.fetchAllowances();
    });

    expect(allowances).toHaveLength(3);

    expect(allowances?.[0]).toEqual({
      allowanceState: AllowanceState.Enabled,
      address: '0xToken1',
      tag: AllowanceState.Enabled,
      isStaked: false,
      decimals: 18,
      name: 'Token 1',
      symbol: 'TKN1',
      allowance: mockTokens[0].globalAllowance,
      chainId: mockChainId,
    });

    expect(allowances?.[1]).toEqual({
      allowanceState: AllowanceState.Limited,
      address: '0xToken2',
      tag: AllowanceState.Limited,
      isStaked: false,
      decimals: 6,
      name: 'Token 2',
      symbol: 'TKN2',
      allowance: mockTokens[1].usAllowance,
      chainId: mockChainId,
    });

    expect(allowances?.[2]).toEqual({
      allowanceState: AllowanceState.NotEnabled,
      address: '0xToken3',
      tag: AllowanceState.NotEnabled,
      isStaked: false,
      decimals: 18,
      name: 'Token 3',
      symbol: 'TKN3',
      allowance: mockTokens[2].globalAllowance,
      chainId: mockChainId,
    });

    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledWith(mockAddress);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Failed to fetch allowances');
    mockGetSupportedTokensAllowances.mockRejectedValueOnce(mockError);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    await act(async () => {
      await expect(result.current.fetchAllowances()).rejects.toThrow(
        'Failed to fetch token allowances',
      );
    });

    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      mockError,
      'useGetAllowances::Failed to fetch token allowances',
    );
  });

  it('should not fetch allowances when SDK is not available', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    let allowances: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances = await result.current.fetchAllowances();
    });

    expect(allowances).toBeUndefined();
    expect(mockGetSupportedTokensAllowances).not.toHaveBeenCalled();
  });

  it('should not fetch allowances when address is not provided', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(undefined));

    let allowances: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances = await result.current.fetchAllowances();
    });

    expect(allowances).toBeUndefined();
    expect(mockGetSupportedTokensAllowances).not.toHaveBeenCalled();
  });

  it('should correctly classify allowance states', async () => {
    const mockTokens = [
      // NotEnabled: both allowances are zero
      createMockToken('0xToken1', '0', '0'),
      // Limited: US allowance is non-zero and less than ARBITRARY_ALLOWANCE
      createMockToken('0xToken2', '50000', '0'),
      // Enabled: global allowance is greater than or equal to ARBITRARY_ALLOWANCE
      createMockToken('0xToken3', '0', ARBITRARY_ALLOWANCE.toString()),
      // Enabled: global allowance is much greater than ARBITRARY_ALLOWANCE
      createMockToken('0xToken4', '0', (ARBITRARY_ALLOWANCE * 2).toString()),
      // Limited: US allowance takes precedence and is limited
      createMockToken('0xToken5', '50000', ARBITRARY_ALLOWANCE.toString()),
      // Enabled: US allowance takes precedence and is enabled
      createMockToken('0xToken6', ARBITRARY_ALLOWANCE.toString(), '0'),
    ];

    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    let allowances: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances = await result.current.fetchAllowances();
    });

    expect(allowances).toHaveLength(6);

    expect(allowances?.[0]?.allowanceState).toBe(AllowanceState.NotEnabled);
    expect(allowances?.[1]?.allowanceState).toBe(AllowanceState.Limited);
    expect(allowances?.[2]?.allowanceState).toBe(AllowanceState.Enabled);
    expect(allowances?.[3]?.allowanceState).toBe(AllowanceState.Enabled);
    expect(allowances?.[4]?.allowanceState).toBe(AllowanceState.Limited);
    expect(allowances?.[5]?.allowanceState).toBe(AllowanceState.Enabled);
  });

  it('should handle multiple consecutive fetch calls', async () => {
    const mockTokensSets = [
      [createMockToken('0xToken1', '1000000', '0')],
      [createMockToken('0xToken2', '0', '0')],
      [createMockToken('0xToken3', '0', ARBITRARY_ALLOWANCE.toString())],
    ];

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    const { result } = renderHook(() => useGetAllowances(mockAddress));

    // First call
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokensSets[0]);
    let allowances1: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances1 = await result.current.fetchAllowances();
    });
    expect(allowances1).toHaveLength(1);
    expect(allowances1?.[0]?.allowanceState).toBe(AllowanceState.Limited);

    // Second call
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokensSets[1]);
    let allowances2: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances2 = await result.current.fetchAllowances();
    });
    expect(allowances2).toHaveLength(1);
    expect(allowances2?.[0]?.allowanceState).toBe(AllowanceState.NotEnabled);

    // Third call
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokensSets[2]);
    let allowances3: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances3 = await result.current.fetchAllowances();
    });
    expect(allowances3).toHaveLength(1);
    expect(allowances3?.[0]?.allowanceState).toBe(AllowanceState.Enabled);

    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(3);
  });

  it('should handle empty response from API', async () => {
    mockGetSupportedTokensAllowances.mockResolvedValueOnce([]);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    let allowances: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances = await result.current.fetchAllowances();
    });

    expect(allowances).toEqual([]);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(1);
  });

  it('should filter out tokens not found in supportedTokens', async () => {
    const mockTokens = [
      createMockToken('0xToken1', '1000000', '0'),
      createMockToken('0xUnknownToken', '1000000', '0'),
    ];

    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useGetAllowances(mockAddress));

    let allowances: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances = await result.current.fetchAllowances();
    });

    expect(allowances).toHaveLength(1);
    expect(allowances?.[0]?.address).toBe('0xToken1');
    expect(allowances?.[0]?.symbol).toBe('TKN1');
  });

  it('should update when address changes', async () => {
    const mockTokens = [createMockToken('0xToken1', '1000000', '0')];
    const address1 = '0x1111111111111111111111111111111111111111';
    const address2 = '0x2222222222222222222222222222222222222222';

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result, rerender } = renderHook(
      ({ address }) => useGetAllowances(address),
      { initialProps: { address: address1 } },
    );

    // First fetch with address1
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    let allowances1: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances1 = await result.current.fetchAllowances();
    });
    expect(allowances1).toHaveLength(1);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledWith(address1);

    // Change address
    rerender({ address: address2 });

    // Second fetch with address2
    mockGetSupportedTokensAllowances.mockResolvedValueOnce(mockTokens);
    let allowances2: CardTokenAllowance[] | undefined;
    await act(async () => {
      allowances2 = await result.current.fetchAllowances();
    });
    expect(allowances2).toHaveLength(1);
    expect(mockGetSupportedTokensAllowances).toHaveBeenLastCalledWith(address2);
    expect(mockGetSupportedTokensAllowances).toHaveBeenCalledTimes(2);
  });
});
