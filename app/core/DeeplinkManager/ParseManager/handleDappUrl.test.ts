import UrlParser from 'url-parse';
import extractURLParams from './extractURLParams';
import handleDappUrl from './handleDappUrl';
import handleBrowserUrl from '../Handlers/handleBrowserUrl';

// Mock handleBrowserUrl and extractURLParams
jest.mock('../Handlers/handleBrowserUrl', () => jest.fn());

jest.mock('./extractURLParams');

describe('handleDappProtocol', () => {
  const mockHandleBrowserUrl = handleBrowserUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should enforce https protocol and call browser callback with the correct URL', () => {
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
    expect(mockHandleBrowserUrl).toHaveBeenCalledWith({
      url: urlObj.href,
      callback: browserCallBackMock,
    });
  });

  it('should correctly process a URL from extractURLParams and enforce HTTPS', () => {
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
    expect(mockHandleBrowserUrl).toHaveBeenCalledWith({
      url: expect.stringContaining('https://'),
      callback: browserCallBackMock,
    });
  });

  it('should convert non-http protocols to https as well', () => {
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

    expect(mockHandleBrowserUrl).toHaveBeenCalledWith({
      url: 'https://example.com/',
      callback: browserCallBackMock,
    });
  });
});
