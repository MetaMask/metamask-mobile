import { mapGifPage, toGifLocale } from './gifPage';

const gifFile = (url: string) => ({ gif: { url, width: 100, height: 100 } });

describe('gifPage', () => {
  it('maps an en locale to the us country code', () => {
    expect(toGifLocale('en')).toBe('us');
    expect(toGifLocale('en-US')).toBe('us');
    expect(toGifLocale('pt-BR')).toBe('br');
  });

  it('maps a search payload to preview and full gif urls', () => {
    const page = mapGifPage({
      result: true,
      data: {
        data: [
          {
            id: 42,
            slug: 'hello-hi',
            title: 'Hello',
            file: {
              hd: gifFile('https://static.klipy.com/hd.gif'),
              md: gifFile('https://static.klipy.com/md.gif'),
              sm: gifFile('https://static.klipy.com/sm.gif'),
              xs: gifFile('https://static.klipy.com/xs.gif'),
            },
          },
          { id: 7, title: 'Broken', file: {} },
        ],
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

  it('rejects a payload that is not a successful GIF page', () => {
    expect(() => mapGifPage({ result: false })).toThrow('request_failed');
  });
});
