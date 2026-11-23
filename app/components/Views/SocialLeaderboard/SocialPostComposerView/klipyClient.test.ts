import { fetchKlipyGifs, KlipyApiError, mapKlipyGifPage } from './klipyClient';

const helloItem = {
  id: 1,
  title: 'Hello',
  file: {
    md: { gif: { url: 'https://static.klipy.com/one.gif' } },
  },
};

describe('klipyClient', () => {
  it('throws when the payload is not a successful KLIPY page', () => {
    expect(() => mapKlipyGifPage({ result: false })).toThrow(KlipyApiError);
  });

  it('throws when the api key is missing', async () => {
    const fetchImpl = jest.fn();

    await expect(
      fetchKlipyGifs({
        query: '',
        page: 1,
        locale: 'en',
        apiKey: '  ',
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: 'missing_api_key' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('requests trending gifs when the query is empty', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: true,
        data: { data: [helloItem], has_next: false },
      }),
    });

    const page = await fetchKlipyGifs({
      query: '   ',
      page: 1,
      locale: 'en',
      apiKey: 'test-key',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/test-key/gifs/trending?'),
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(String(fetchImpl.mock.calls[0][0])).toContain('locale=us');
    expect(String(fetchImpl.mock.calls[0][0])).not.toContain('q=');
    expect(page.gifs).toHaveLength(1);
  });

  it('requests search gifs for a keyword', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: true,
        data: { data: [helloItem], has_next: false },
      }),
    });

    await fetchKlipyGifs({
      query: 'cheers',
      page: 2,
      locale: 'de',
      apiKey: 'test-key',
      fetchImpl,
    });

    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('/api/v1/test-key/gifs/search?');
    expect(url).toContain('q=cheers');
    expect(url).toContain('page=2');
    expect(url).toContain('locale=de');
    expect(url).toContain('content_filter=medium');
    expect(url).toContain('format_filter=gif');
  });

  it('throws when the request fails', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false });

    await expect(
      fetchKlipyGifs({
        query: 'cheers',
        page: 1,
        locale: 'en',
        apiKey: 'test-key',
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: 'request_failed' });
  });
});
