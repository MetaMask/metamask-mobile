import UrlParser from 'url-parse';
import extractURLParams from '../../../utils/extractURLParams';
import handleDappUrl from '../handleDappUrl';
import handleBrowserUrl from '../handleBrowserUrl';

// Mock DeeplinkManager and extractURLParams
jest.mock('../../../DeeplinkManager', () =>
  jest.fn().mockImplementation(() => ({})),
);

jest.mock('../../../utils/extractURLParams');
jest.mock('../handleBrowserUrl');

describe('handleDappProtocol', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enforces https protocol and calls browser callback with the correct URL', () => {
    // Arrange
    const handledMock = jest.fn();
    const browserCallBackMock = jest.fn();
    const urlObj = {
      protocol: 'https:',
      href: 'http://example.com',
      set: jest.fn(),
    } as unknown as ReturnType<typeof extractURLParams>['urlObj'];

    // Act
    handleDappUrl({
      handled: handledMock,
      urlObj,
      browserCallBack: browserCallBackMock,
    });

    // Assert
    expect(handledMock).toHaveBeenCalled();
    expect(urlObj.protocol).toBe('https:');
    expect(handleBrowserUrl).toHaveBeenCalledWith({
      url: urlObj.href,
      callback: browserCallBackMock,
    });
  });

  it('correctly processes a URL from extractURLParams and enforces HTTPS', () => {
    const handledMock = jest.fn();
    const browserCallBackMock = jest.fn();
    const testUrl = 'dapp/http://example.com';

    // Mock extractURLParams to return a URL object based on the URL passed
    (extractURLParams as jest.Mock).mockImplementation((url: string) => {
      const urlObj = new UrlParser(url);
      return {
        urlObj,
        params: {},
      };
    });

    const { urlObj } = extractURLParams(testUrl);

    handleDappUrl({
      handled: handledMock,
      urlObj,
      browserCallBack: browserCallBackMock,
    });

    expect(handledMock).toHaveBeenCalled();
    expect(urlObj.href.includes('https://')).toBe(true); // Check if 'https' is now part of the URL
    expect(handleBrowserUrl).toHaveBeenCalledWith({
      url: expect.stringContaining('https://'),
      callback: browserCallBackMock,
    });
  });

  it('converts non-http protocols to https as well', () => {
    const handledMock = jest.fn();
    const browserCallBackMock = jest.fn();
    const testUrl = 'dapp/ftp://example.com';

    // Assuming extractURLParams implementation is similar to the provided context
    (extractURLParams as jest.Mock).mockImplementation((url: string) => {
      // Simulating the protocol stripping and re-adding logic
      const urlObj = new UrlParser(url.replace('dapp/', ''));
      return { urlObj, params: {} };
    });

    const { urlObj } = extractURLParams(testUrl);

    handleDappUrl({
      handled: handledMock,
      urlObj,
      browserCallBack: browserCallBackMock,
    });

    expect(handleBrowserUrl).toHaveBeenCalledWith({
      url: 'https://example.com/',
      callback: browserCallBackMock,
    });
  });
});
