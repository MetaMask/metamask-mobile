import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useCardFundingConfig } from './useCardFundingConfig';
import Engine from '../../../../core/Engine';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getFundingConfig: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetFundingConfig = Engine.context.CardController
  .getFundingConfig as jest.Mock;

let activeQueryClient: QueryClient | null = null;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  activeQueryClient = queryClient;
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
}

function setupSelectors(providerId: string | null, isAuthenticated: boolean) {
  let callCount = 0;
  mockUseSelector.mockImplementation(() => {
    callCount++;
    return callCount % 2 === 1 ? providerId : isAuthenticated;
  });
}

describe('useCardFundingConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    activeQueryClient?.clear();
    activeQueryClient = null;
  });

  it('calls getFundingConfig when authenticated with a provider', async () => {
    const mockConfig = {
      maxLimit: 1000,
      fundingOptions: [],
      supportedChains: [],
    };
    mockGetFundingConfig.mockResolvedValue(mockConfig);
    setupSelectors('baanx', true);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardFundingConfig(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetFundingConfig).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockConfig);
  });

  it('does not call getFundingConfig when not authenticated', async () => {
    setupSelectors('baanx', false);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardFundingConfig(), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetFundingConfig).not.toHaveBeenCalled();
  });

  it('does not call getFundingConfig when no provider', async () => {
    setupSelectors(null, true);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardFundingConfig(), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetFundingConfig).not.toHaveBeenCalled();
  });

  it('propagates error from getFundingConfig', async () => {
    mockGetFundingConfig.mockRejectedValue(new Error('Network error'));
    setupSelectors('baanx', true);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardFundingConfig(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
