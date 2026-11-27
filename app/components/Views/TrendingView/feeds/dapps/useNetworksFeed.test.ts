import { renderHook, waitFor } from '@testing-library/react-native';
import { useNetworksFeed } from './useNetworksFeed';

const HARDCODED = ['Linea', 'Sei', 'Monad', 'Solana', 'Tron', 'Stellar'];

const mockFetch = (ok: boolean, body: unknown) =>
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue({ ok, json: async () => body } as Response);

describe('useNetworksFeed', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the API ecosystems in API order with remote logos', async () => {
    mockFetch(true, {
      ecosystems: [
        {
          id: 'np-stellar',
          networkName: 'Stellar',
          logo: 'https://example.com/stellar.png',
          hubUrl: 'https://portfolio.metamask.io/explore/networks/stellar',
        },
        {
          id: 'network-linea',
          networkName: 'Linea',
          logo: 'https://example.com/linea.svg',
          hubUrl: 'https://portfolio.metamask.io/explore/networks/linea',
        },
      ],
    });

    const { result } = renderHook(() => useNetworksFeed());

    await waitFor(() =>
      expect(result.current.data.map((site) => site.name)).toStrictEqual([
        'Stellar',
        'Linea',
      ]),
    );
    expect(result.current.data[0]).toStrictEqual({
      id: 'np-stellar',
      name: 'Stellar',
      url: 'https://portfolio.metamask.io/explore/networks/stellar',
      displayUrl: 'Stellar Hub',
      logoUrl: 'https://example.com/stellar.png',
    });
  });

  it.each([
    [
      'the request fails',
      () => jest.spyOn(global, 'fetch').mockRejectedValue(new Error('boom')),
    ],
    ['the response is not ok', () => mockFetch(false, {})],
    ['the list is empty', () => mockFetch(true, { ecosystems: [] })],
  ])('keeps the hardcoded networks when %s', async (_, arrange) => {
    arrange();

    const { result } = renderHook(() => useNetworksFeed());

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(result.current.data.map((site) => site.name)).toStrictEqual(
      HARDCODED,
    );
  });
});
