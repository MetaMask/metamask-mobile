import { getFaviconFromCache, getFaviconURLFromHtml, cacheFavicon } from '.';
import { storeFavicon } from '../../actions/browser';

jest.mock('../../store', () => {
  const actual = jest.requireActual('../../store');
  return {
    ...actual,
    store: {
      ...actual.store,
      getState: jest.fn(() => ({
        browser: {
          favicons: [
            {
              origin: 'metamask.github.io',
              url: 'https://metamask.github.io/metamask-fox.svg',
            },
          ],
        },
      })),
    },
  };
});

// Import the store module after the mock is set up
import { store } from '../../store';

// Make sure to clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

describe('favicon utility getFaviconURLFromHtml() function', () => {
  /**
   * should be able to find favicon from html links collection
   */
  it('returns favicon URL from html', async () => {
    // mocking with an actual html page content
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () =>
          Promise.resolve(
            '<html>\n' +
              '  <head>\n' +
              '    <meta charset="UTF-8" />\n' +
              '    <title>E2E Test Dapp</title>\n' +
              '    <link\n' +
              '      rel="stylesheet"\n' +
              '      href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"\n' +
              '    />\n' +
              '    <link rel="icon" type="image/svg" href="metamask-fox.svg" />\n' +
              '    <link\n' +
              '      href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.4.1/css/bootstrap.min.css"\n' +
              '      rel="stylesheet"\n' +
              '    />\n' +
              '    <link\n' +
              '      href="https://cdnjs.cloudflare.com/ajax/libs/mdbootstrap/4.14.1/css/mdb.min.css"\n' +
              '      rel="stylesheet"\n' +
              '    />\n' +
              '    <link rel="stylesheet" href="index.css" type="text/css" />\n' +
              '  </head></html>',
          ),
        ok: true,
      } as Response),
    );

    const faviconUrl = await getFaviconURLFromHtml(
      'metamask.github.io/test-dapp/',
    );
    expect(faviconUrl).toEqual(
      'https://metamask.github.io/test-dapp/metamask-fox.svg',
    );
  });

  /**
   * origin can be a non valid url, but it should be converted to a valid url
   */
  it('returns favicon URL from valid domain only origin', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () =>
          Promise.resolve(
            '<html><head><link rel="icon" href="metamask-fox.svg"></head></html>',
          ),
        ok: true,
      } as Response),
    );

    const faviconUrl = await getFaviconURLFromHtml('metamask.github.io');
    expect(faviconUrl).toEqual('https://metamask.github.io/metamask-fox.svg');
  });

  it('returns favicon URL with non conforming IE html format', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () =>
          Promise.resolve(
            '<html><head><link rel="shortcut icon" href="metamask-fox.svg"></head></html>',
          ),
        ok: true,
      } as Response),
    );

    const faviconUrl = await getFaviconURLFromHtml('metamask.github.io');
    expect(faviconUrl).toEqual('https://metamask.github.io/metamask-fox.svg');
  });

  it('ignores non favicon icons in html', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () =>
          Promise.resolve(
            '<html><head>' +
              '<link rel="apple-touch-icon" sizes="192x192" href="./images/192x192_App_Icon.png"/>\n' +
              '<link rel="apple-touch-icon" sizes="512x512" href="./images/512x512_App_Icon.png"/>' +
              '</head></html>',
          ),
        ok: true,
      } as Response),
    );

    const faviconUrl = await getFaviconURLFromHtml('metamask.github.io');
    expect(faviconUrl).toEqual('');
  });

  /**
   * return the first favicon found as it's done in the extension
   */
  it('returns the first favicon in html', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () =>
          Promise.resolve(
            '<html><head><link rel="icon" href="metamask-fox1.svg"><link rel="icon" href="metamask-fox2.svg"></head></html>',
          ),
        ok: true,
      } as Response),
    );

    const faviconUrl = await getFaviconURLFromHtml('metamask.github.io');
    expect(faviconUrl).toEqual('https://metamask.github.io/metamask-fox1.svg');
  });

  /**
   * return empty string if no favicon found and this will trigger fallback icon
   */
  it('returns empty string for invalid origin', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
      } as Response),
    );

    const faviconUrl = await getFaviconURLFromHtml('invalid-url');
    expect(faviconUrl).toEqual('');
  });
});

describe('favicon utility getFaviconFromCache() function', () => {
  it('returns the correct favicon URL if it exists in the cache', async () => {
    const testOrigin = 'metamask.github.io';
    const testFaviconUrl = 'https://metamask.github.io/metamask-fox.svg';

    const { browser } = store.getState();
    const cachedFavicon = browser.favicons.find(
      (favicon: { origin: string; url: string }) =>
        favicon.origin === testOrigin,
    );
    expect(cachedFavicon).toEqual({ origin: testOrigin, url: testFaviconUrl });

    const faviconUrl = await getFaviconFromCache(testOrigin);
    expect(faviconUrl).toEqual(testFaviconUrl);
  });

  it('returns null if the favicon does not exist in the cache', async () => {
    const faviconUrl = await getFaviconFromCache('nonExistentOrigin');
    expect(faviconUrl).toBeNull();
  });
});

describe('cacheFavicon function', () => {
  it('dispatches storeFavicon action if originUrl is valid', async () => {
    const originUrl = 'https://metamask.github.io/test-dapp/';
    const faviconUrl = 'https://metamask.github.io/metamask-fox.svg';

    const dispatchMock = jest.spyOn(store, 'dispatch');

    await cacheFavicon(originUrl, faviconUrl);

    expect(dispatchMock).toHaveBeenCalledWith(
      storeFavicon({ origin: 'metamask.github.io', url: faviconUrl }),
    );
  });

  it('dispatches storeFavicon action with fixed origin if originUrl is not valid URL', async () => {
    const originUrl = 'invalid-url';
    const faviconUrl = 'https://metamask.github.io/metamask-fox.svg';

    const dispatchMock = jest.spyOn(store, 'dispatch');

    await cacheFavicon(originUrl, faviconUrl);

    expect(dispatchMock).toHaveBeenCalledWith(
      storeFavicon({ origin: 'invalid-url', url: faviconUrl }),
    );
  });
});
