import getFaviconURLFromHtml from '.';

describe('get favicon url', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * should be able to find favicon from html links collection
   */
  it('should return favicon from valid url', async () => {
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
              '  </head>',
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
  it('should return favicon from valid origin', async () => {
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

  it('should return favicon with non conforming IE format', async () => {
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

  it('should ignore non favicon icons', async () => {
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
  it('should return the first favicon', async () => {
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
  it('should return empty string for invalid url', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
      } as Response),
    );

    const faviconUrl = await getFaviconURLFromHtml('invalid-url');
    expect(faviconUrl).toEqual('');
  });
});
