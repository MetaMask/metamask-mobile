import Port from './Port';

// Mock the browser scripts
jest.mock('../../util/browserScripts', () => ({
  JS_POST_MESSAGE_TO_PROVIDER: jest.fn(() => 'mocked-main-frame-script'),
  JS_IFRAME_POST_MESSAGE_TO_PROVIDER: jest.fn(() => 'mocked-iframe-script'),
}));

describe('Port', () => {
  let mockBrowserWindow: { injectJavaScript: jest.Mock };
  let port: Port;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Arrange - Reset mocks before each test
    mockBrowserWindow = {
      injectJavaScript: jest.fn(),
    };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    // Clean up spies
    consoleWarnSpy.mockRestore();
  });

  describe('postMessage', () => {
    describe('when origin is wildcard', () => {
      it('logs warning and does not inject JavaScript', () => {
        // Arrange
        port = new Port(mockBrowserWindow, true);
        const message = { type: 'test', data: 'testData' };
        const wildcardOrigin = '*';

        // Act
        port.postMessage(message, wildcardOrigin);

        // Assert
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Wildcard origin not allowed',
        );
        expect(mockBrowserWindow.injectJavaScript).not.toHaveBeenCalled();
      });
    });

    describe('when origin is valid', () => {
      it('injects JavaScript for main frame when isMainFrame is true', () => {
        // Arrange
        port = new Port(mockBrowserWindow, true);
        const message = { type: 'test', data: 'testData' };
        const validOrigin = 'https://example.com';

        // Act
        port.postMessage(message, validOrigin);

        // Assert
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(mockBrowserWindow.injectJavaScript).toHaveBeenCalledWith(
          'mocked-main-frame-script',
        );
      });

      it('injects JavaScript for iframe when isMainFrame is false', () => {
        // Arrange
        port = new Port(mockBrowserWindow, false);
        const message = { type: 'test', data: 'testData' };
        const validOrigin = 'https://example.com';

        // Act
        port.postMessage(message, validOrigin);

        // Assert
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(mockBrowserWindow.injectJavaScript).toHaveBeenCalledWith(
          'mocked-iframe-script',
        );
      });

      it('handles null browserWindow gracefully', () => {
        // Arrange
        port = new Port(null, true);
        const message = { type: 'test', data: 'testData' };
        const validOrigin = 'https://example.com';

        // Act
        port.postMessage(message, validOrigin);

        // Assert
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        // Should not throw error when browserWindow is null
      });
    });
  });
});
