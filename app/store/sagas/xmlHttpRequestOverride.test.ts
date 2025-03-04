import {
  createLoggingXHROverride,
  overrideXMLHttpRequest,
  restoreXMLHttpRequest,
} from './xmlHttpRequestOverride';
// eslint-disable-next-line import/no-namespace
import * as trace from '../../util/trace';

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

  it('should trace XMLHttpRequest calls', (done) => {
    const mockTrace = jest.spyOn(trace, 'trace').mockImplementation();
    overrideXMLHttpRequest();
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      expect(mockTrace).toHaveBeenCalledWith({
        name: 'https://api.example.com/data',
        op: trace.TraceOperation.NoBasicFunctionalityHttp,
      });
      done();
    };
    xhr.open('GET', 'https://api.example.com/data');
    xhr.send();
  });
});

describe('createLoggingXHROverride', () => {
  let mockTrace: jest.SpyInstance;
  beforeEach(() => {
    mockTrace = jest.spyOn(trace, 'trace').mockImplementation();
    createLoggingXHROverride();
  });

  afterEach(() => {
    restoreXMLHttpRequest();
    jest.clearAllMocks();
  });

  it('should trace XMLHttpRequest calls', (done) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      expect(mockTrace).toHaveBeenCalledWith({
        name: 'https://api.example.com/data',
        op: trace.TraceOperation.Http,
      });
      done();
    };
    xhr.open('GET', 'https://api.example.com/data');
    xhr.send();
  });
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
