import {
  overrideXMLHttpRequest,
  restoreXMLHttpRequest,
} from './xmlHttpRequestOverride';

const blockedURLs = [
  'https://example.com/price-api?foo=bar',
  'https://infura.io.test',
  'https://mainnnet.infura.io.test',
  'https://example.com/search?term=gas-api',
  'https://static.cxy.example.com',
  'https://example.com/search?domain=infura.io',
  'https://example.com/token-api?foo=bar',
];
const notBlockedURLs = [
  'https://proxy.metafi.codefi.network/opensea/api/v2',
  'https://gateway.pinata.cloud/',
  'https://api.etherscan.io/',
  'https://api2.branch.io/',
  'https://cdn.branch.io/',
  'https://rpc.tenderly.co/',
  'https://example.com/my-api?foo=bar',
  'https://mainnnet.infura.test',
  'https://example.com/search?term=gasapi',
  'https://example.com/search?domain=infura.test',
  'https://example.com/tokenapi?foo=bar',
];

describe('overrideXMLHttpRequest', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  blockedURLs.forEach((url) =>
    it(`blocks requests to blocked URL ${url} when enabled`, (done) => {
      // The override does not emit any `abort` or `error` avent - hence we fall back to logs here
      const logSpy = jest.spyOn(console, 'error');
      overrideXMLHttpRequest();
      const req = new global.XMLHttpRequest();
      req.open('POST', url);
      req.send('{"foo": "bar"}');
      setImmediate(() => {
        expect(logSpy.mock.calls[0][0].message).toMatch(
          `Disallowed URL: ${url}`,
        );
        done();
      });
    }),
  );

  notBlockedURLs.forEach((url) =>
    it(`does not block requests to non blocked URL ${url} when enabled`, (done) => {
      const logSpy = jest.spyOn(console, 'error');
      overrideXMLHttpRequest();
      const req = new global.XMLHttpRequest();
      req.onload = () => {
        expect(logSpy.mock.calls.length).toBe(0);
        done();
      };
      req.open('POST', url);
      req.send('{"foo": "bar"}');
    }),
  );
});

describe('restoreXMLHttpRequest', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  blockedURLs.forEach((url) =>
    it(`does not block requests to blocked URL ${url} when disabled`, (done) => {
      const logSpy = jest.spyOn(console, 'error');
      overrideXMLHttpRequest();
      restoreXMLHttpRequest();
      const req = new global.XMLHttpRequest();
      req.onload = () => {
        expect(logSpy.mock.calls.length).toBe(0);
        done();
      };
      req.open('POST', url);
      req.send('{"foo": "bar"}');
    }),
  );
});

describe('handleBlockedRequest behavior', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls onerror handler when blocking a request', (done) => {
    const mockOnerror = jest.fn();
    overrideXMLHttpRequest();
    const req = new global.XMLHttpRequest();
    req.onerror = mockOnerror;

    req.open('POST', 'https://example.com/gas-api');
    req.send();

    setImmediate(() => {
      expect(mockOnerror).toHaveBeenCalledTimes(1);
      expect(mockOnerror).toHaveBeenCalledWith(expect.any(Error));
      done();
    });
  });

  it('calls abort method when blocking a request', (done) => {
    const mockAbort = jest.fn();
    overrideXMLHttpRequest();
    const req = new global.XMLHttpRequest();
    req.abort = mockAbort;

    req.open('POST', 'https://example.com/gas-api');
    req.send();

    setImmediate(() => {
      expect(mockAbort).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('calls onloadend handler when blocking a request', (done) => {
    const mockOnloadend = jest.fn();
    overrideXMLHttpRequest();
    const req = new global.XMLHttpRequest();
    req.onloadend = mockOnloadend;

    req.open('POST', 'https://example.com/gas-api');
    req.send();

    setImmediate(() => {
      expect(mockOnloadend).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('handles missing handlers gracefully when blocking a request', (done) => {
    const logSpy = jest.spyOn(console, 'error');
    overrideXMLHttpRequest();
    const req = new global.XMLHttpRequest();
    // Explicitly set handlers to null
    req.onerror = null;
    req.onloadend = null;
    req.abort = () => {
      /* no-op */
    };

    req.open('POST', 'https://example.com/gas-api');
    req.send();

    setImmediate(() => {
      // Should still log the error even without handlers
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0].message).toMatch(
        'Disallowed URL: https://example.com/gas-api',
      );
      done();
    });
  });

  it('continues blocking when handler throws an error', (done) => {
    const logSpy = jest.spyOn(console, 'error');
    const throwingHandler = jest.fn(() => {
      throw new Error('Handler failed');
    });
    overrideXMLHttpRequest();
    const req = new global.XMLHttpRequest();
    req.onerror = throwingHandler;

    req.open('POST', 'https://example.com/gas-api');
    req.send();

    setImmediate(() => {
      expect(throwingHandler).toHaveBeenCalledTimes(1);
      // Should still log the original blocking error despite handler failure
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0].message).toMatch(
        'Disallowed URL: https://example.com/gas-api',
      );
      done();
    });
  });
});
