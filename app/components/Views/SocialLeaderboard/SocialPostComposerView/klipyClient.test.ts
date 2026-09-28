import {
  fetchKlipyGifs,
  KlipyApiError,
  mapKlipyGifPage,
  toKlipyLocale,
} from './klipyClient';

const gifFile = (url: string) => ({ gif: { url, width: 100, height: 100 } });

const helloItem = {
  id: 42,
  slug: 'hello-hi',
  title: 'Hello',
  file: {
    hd: gifFile('https://static.klipy.com/hd.gif'),
    md: gifFile('https://static.klipy.com/md.gif'),
    sm: gifFile('https://static.klipy.com/sm.gif'),
    xs: gifFile('https://static.klipy.com/xs.gif'),
  },
};

describe('klipyClient', () => {
  it('maps an en locale to the us country code', () => {
    expect(toKlipyLocale('en')).toBe('us');
    expect(toKlipyLocale('en-US')).toBe('us');
    expect(toKlipyLocale('pt-BR')).toBe('br');
  });

  it('maps a search payload to preview and full gif urls', () => {
    const page = mapKlipyGifPage({
      result: true,
      data: {
        data: [helloItem, { id: 7, title: 'Broken', file: {} }],
        has_next: true,
      },
    });

    expect(page).toEqual({
      hasNext: true,
      gifs: [
        {
          id: '42',
          title: 'Hello',
          previewUrl: 'https://static.klipy.com/sm.gif',
          gifUrl: 'https://static.klipy.com/md.gif',
        },
      ],
    });
  });

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
