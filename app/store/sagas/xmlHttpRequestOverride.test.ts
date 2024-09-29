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
  'https://cloudflare-ipfs.com/',
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
