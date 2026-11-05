import { fetchGifs, GifApiError } from './gifClient';

const mockCall = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
  },
}));

const pageBody = {
  result: true,
  data: {
    has_next: false,
    data: [
      {
        id: 'gif-1',
        title: 'Hello',
        file: {
          sm: { gif: { url: 'https://static.klipy.com/sm.gif' } },
          md: { gif: { url: 'https://static.klipy.com/md.gif' } },
        },
      },
    ],
  },
};

describe('gifClient', () => {
  beforeEach(() => {
    mockCall.mockReset();
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
    ).rejects.toBeInstanceOf(GifApiError);
  });

  it('throws when the GIF page payload is rejected', async () => {
    mockCall.mockResolvedValue({ result: false });

    await expect(
      fetchGifs({
        query: '',
        page: 1,
        locale: 'en',
      }),
    ).rejects.toMatchObject({ code: 'request_failed' });
  });
});
