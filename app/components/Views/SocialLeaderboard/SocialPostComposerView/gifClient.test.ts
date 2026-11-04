import { fetchGifs, GifApiError, mapGifPage, toGifLocale } from './gifClient';

const mockCall = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
  },
}));

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

const pageBody = {
  result: true,
  data: { data: [helloItem], has_next: false },
};

describe('gifClient', () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it('maps an en locale to the us country code', () => {
    expect(toGifLocale('en')).toBe('us');
    expect(toGifLocale('en-US')).toBe('us');
    expect(toGifLocale('pt-BR')).toBe('br');
  });

  it('maps a search payload to preview and full gif urls', () => {
    const page = mapGifPage({
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

  it('throws when the payload is not a successful GIF page', () => {
    expect(() => mapGifPage({ result: false })).toThrow(GifApiError);
  });

  it('requests trending GIFs when the query is empty', async () => {
    mockCall.mockResolvedValue(pageBody);

    const page = await fetchGifs({
      query: '   ',
      page: 1,
      locale: 'en',
    });

    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTrendingGifs', {
      page: 1,
      per_page: 16,
      locale: 'us',
      content_filter: 'medium',
      format_filter: 'gif',
    });
    expect(page.gifs).toHaveLength(1);
  });

  it('requests search GIFs for a keyword', async () => {
    mockCall.mockResolvedValue(pageBody);

    await fetchGifs({
      query: 'cheers',
      page: 2,
      locale: 'de',
    });

    expect(mockCall).toHaveBeenCalledWith('SocialService:searchGifs', {
      page: 2,
      per_page: 16,
      locale: 'de',
      content_filter: 'medium',
      format_filter: 'gif',
      q: 'cheers',
    });
  });

  it('throws when the messenger request fails', async () => {
    mockCall.mockRejectedValue(new Error('429'));

    await expect(
      fetchGifs({
        query: 'cheers',
        page: 1,
        locale: 'en',
      }),
    ).rejects.toMatchObject({ code: 'request_failed' });
  });
});
