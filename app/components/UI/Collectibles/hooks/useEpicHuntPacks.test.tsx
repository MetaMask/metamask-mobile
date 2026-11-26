import React, { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockEpicOddsMachines } from '#app/components/UI/Collectibles/mocks/epicOdds';
import { useEpicHuntPacks } from '#app/components/UI/Collectibles/hooks/useEpicHuntPacks';

const mockFetchMachines = jest.fn();

jest.mock('#app/components/UI/Collectibles/mocks/epicOdds', () => ({
  ...jest.requireActual('#app/components/UI/Collectibles/mocks/epicOdds'),
  fetchMockEpicOddsMachines: () => mockFetchMachines(),
}));

function renderEpicHuntPacks() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return renderHook(() => useEpicHuntPacks(), { wrapper: Wrapper });
}

describe('useEpicHuntPacks', () => {
  beforeEach(() => {
    mockFetchMachines.mockResolvedValue(mockEpicOddsMachines);
  });

  it('labels each pack with its Epic odds and pulls since last Epic', async () => {
    const { result } = renderEpicHuntPacks();

    await waitFor(() => expect(result.current.isPending).toBe(false));

    const pack = result.current.data.find(({ code }) => code === 'pack-1');
    expect(pack?.subtitle).toBe('Epic 1% · 32 pulls since last Epic');
    expect(pack?.pullsOverAverage).toBe(-68);
  });

  it('shows no packs when the machines fail to load', async () => {
    mockFetchMachines.mockRejectedValue(new Error('machines unavailable'));
    const { result } = renderEpicHuntPacks();

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.data).toEqual([]);
  });
});
