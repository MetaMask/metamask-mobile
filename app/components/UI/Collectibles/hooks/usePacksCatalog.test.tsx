import React, { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockPackCategoryMapping } from '#app/components/UI/Collectibles/mocks/packsCatalog';
import { usePacksCatalog } from './usePacksCatalog';

const mockFetchMapping = jest.fn();

jest.mock('#app/components/UI/Collectibles/mocks/packsCatalog', () => ({
  ...jest.requireActual('#app/components/UI/Collectibles/mocks/packsCatalog'),
  fetchMockPackCategoryMapping: () => mockFetchMapping(),
}));

function renderCatalog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return renderHook(() => usePacksCatalog(), { wrapper: Wrapper });
}

describe('usePacksCatalog', () => {
  beforeEach(() => {
    mockFetchMapping.mockResolvedValue(mockPackCategoryMapping);
  });

  it('is pending until packs and mapping load, then lists them', async () => {
    const { result } = renderCatalog();

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.packs.length).toBeGreaterThan(0);
    expect(result.current.categories[0].id).toBe('pokemon');
  });

  it('shows only "All" when the mapping fails to load', async () => {
    mockFetchMapping.mockRejectedValue(new Error('mapping unavailable'));
    const { result } = renderCatalog();

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.categories).toEqual([]);
    expect(result.current.packs.length).toBeGreaterThan(0);
  });
});
