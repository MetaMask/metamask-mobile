import wallet_addEthereumChain from './wallet_addEthereumChain';
import Engine from '../Engine';
// import nock from 'nock';

const mockEngine = Engine;

const correctParams = {
  chainId: '0x64',
  chainName: 'xDai',
  blockExplorerUrls: ['https://blockscout.com/xdai/mainnet'],
  nativeCurrency: { symbol: 'xDai', decimals: 18 },
  rpcUrls: ['https://rpc.gnosischain.com'],
};

const otherOptions = {
  res: {},
  addCustomNetworkRequest: {},
  switchCustomNetworkRequest: {},
};

jest.mock('../Engine', () => ({
  init: () => mockEngine.init({}),
  context: {
    PreferencesController: {
      state: {
        frequentRpcList: [],
      },
    },
    NetworkController: {
      state: {
        providerConfig: {
          chainId: '1',
        },
      },
    },
  },
}));

describe('RPC Method - wallet_addEthereumChain', () => {
  let mockFetch;

  beforeAll(() => {
    mockFetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ result: '0x64' }) }),
    );
    global.fetch = mockFetch;
  });
  afterAll(() => {
    global.fetch.mockClear();
  });
  // beforeAll(() => {
  //   nock.disableNetConnect();
  // });

  // afterAll(() => {
  //   nock.cleanAll();
  //   nock.enableNetConnect();
  // });

  it('should report missing params', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: null,
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain('Expected single, object parameter.');
    }
  });

  it('should report extra keys', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, extraKey: 10 }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        'Received unexpected keys on object parameter. Unsupported keys',
      );
    }
  });

  it('should report invalid rpc url', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, rpcUrls: ['invalid'] }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected an array with at least one valid string HTTPS url 'rpcUrls'`,
      );
    }
  });

  it('should report invalid block explorer url', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, blockExplorerUrls: ['invalid'] }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'.`,
      );
    }
  });

  it('should report invalid chainId', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '10' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'.`,
      );
    }
  });

  it('should report unsafe chainId', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '0xFFFFFFFFFFFED' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        'numerical value greater than max safe value.',
      );
    }
  });

  it('should report chainId not matching rpcUrl returned chainId', async () => {
    // nock('https://rpc.gnosischain.com:443', { encodedQueryParams: true })
    //   .post('/', {
    //     id: '123',
    //     jsonrpc: '2.0',
    //     method: 'eth_chainId',
    //     params: [],
    //   })
    //   .reply(
    //     200,
    //     [
    //       '1f8b0800000000000403aa56ca2acecf2b2a4856b25232d23350d2512a4a2d2ecd2901720d2acc4c80fccc1420dbd0c858a916000000ffff03003f5f04832c000000',
    //     ],
    //     [
    //       'Content-Type',
    //       'application/json',
    //       'Transfer-Encoding',
    //       'chunked',
    //       'Connection',
    //       'close',
    //       'Date',
    //       'Wed, 10 May 2023 14:47:15 GMT',
    //       'Content-Encoding',
    //       'gzip',
    //       'Vary',
    //       'Accept-Encoding',
    //       'Front-End-Https',
    //       'on',
    //       'Access-Control-Allow-Origin',
    //       '*',
    //       'Access-Control-Allow-Credentials',
    //       'true',
    //       'Access-Control-Allow-Methods',
    //       'POST',
    //       'Access-Control-Allow-Headers',
    //       'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization',
    //       'Access-Control-Max-Age',
    //       '1728000',
    //       'X-Cache',
    //       'Miss from cloudfront',
    //       'Via',
    //       '1.1 7403235773a9b23f307196c589d62dac.cloudfront.net (CloudFront)',
    //       'X-Amz-Cf-Pop',
    //       'MXP63-P4',
    //       'X-Amz-Cf-Id',
    //       'tegMm-_pKKedzBQDLooaUPL8QTaQ3ykUz8JipI72Rf-dDVF5DKv0rg==',
    //     ],
    //   );

    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '0x63' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain('does not match');
    }
  });

  it('should report invalid chain name', async () => {
    // nock('https://rpc.gnosischain.com:443', { encodedQueryParams: true })
    //   .post('/', {
    //     id: '123',
    //     jsonrpc: '2.0',
    //     method: 'eth_chainId',
    //     params: [],
    //   })
    //   .reply(
    //     200,
    //     [
    //       '1f8b0800000000000403aa56ca2acecf2b2a4856b25232d23350d2512a4a2d2ecd2901720d2acc4c80fccc1420dbd0c858a916000000ffff03003f5f04832c000000',
    //     ],
    //     [
    //       'Content-Type',
    //       'application/json',
    //       'Transfer-Encoding',
    //       'chunked',
    //       'Connection',
    //       'close',
    //       'Date',
    //       'Wed, 10 May 2023 14:47:15 GMT',
    //       'Content-Encoding',
    //       'gzip',
    //       'Vary',
    //       'Accept-Encoding',
    //       'Front-End-Https',
    //       'on',
    //       'Access-Control-Allow-Origin',
    //       '*',
    //       'Access-Control-Allow-Credentials',
    //       'true',
    //       'Access-Control-Allow-Methods',
    //       'POST',
    //       'Access-Control-Allow-Headers',
    //       'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization',
    //       'Access-Control-Max-Age',
    //       '1728000',
    //       'X-Cache',
    //       'Miss from cloudfront',
    //       'Via',
    //       '1.1 7403235773a9b23f307196c589d62dac.cloudfront.net (CloudFront)',
    //       'X-Amz-Cf-Pop',
    //       'MXP63-P4',
    //       'X-Amz-Cf-Id',
    //       'tegMm-_pKKedzBQDLooaUPL8QTaQ3ykUz8JipI72Rf-dDVF5DKv0rg==',
    //     ],
    //   );

    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainName: undefined }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(`Expected non-empty string 'chainName'.`);
    }
  });

  it('should report invalid native currency', async () => {
    // nock('https://rpc.gnosischain.com:443', { encodedQueryParams: true })
    //   .post('/', {
    //     id: '123',
    //     jsonrpc: '2.0',
    //     method: 'eth_chainId',
    //     params: [],
    //   })
    //   .reply(
    //     200,
    //     [
    //       '1f8b0800000000000403aa56ca2acecf2b2a4856b25232d23350d2512a4a2d2ecd2901720d2acc4c80fccc1420dbd0c858a916000000ffff03003f5f04832c000000',
    //     ],
    //     [
    //       'Content-Type',
    //       'application/json',
    //       'Transfer-Encoding',
    //       'chunked',
    //       'Connection',
    //       'close',
    //       'Date',
    //       'Wed, 10 May 2023 14:47:15 GMT',
    //       'Content-Encoding',
    //       'gzip',
    //       'Vary',
    //       'Accept-Encoding',
    //       'Front-End-Https',
    //       'on',
    //       'Access-Control-Allow-Origin',
    //       '*',
    //       'Access-Control-Allow-Credentials',
    //       'true',
    //       'Access-Control-Allow-Methods',
    //       'POST',
    //       'Access-Control-Allow-Headers',
    //       'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization',
    //       'Access-Control-Max-Age',
    //       '1728000',
    //       'X-Cache',
    //       'Miss from cloudfront',
    //       'Via',
    //       '1.1 7403235773a9b23f307196c589d62dac.cloudfront.net (CloudFront)',
    //       'X-Amz-Cf-Pop',
    //       'MXP63-P4',
    //       'X-Amz-Cf-Id',
    //       'tegMm-_pKKedzBQDLooaUPL8QTaQ3ykUz8JipI72Rf-dDVF5DKv0rg==',
    //     ],
    //   );

    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, nativeCurrency: 'invalid' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected null or object 'nativeCurrency'.`,
      );
    }
  });

  it('should report invalid native currency decimals', async () => {
    // nock('https://rpc.gnosischain.com:443', { encodedQueryParams: true })
    //   .post('/', {
    //     id: '123',
    //     jsonrpc: '2.0',
    //     method: 'eth_chainId',
    //     params: [],
    //   })
    //   .reply(
    //     200,
    //     [
    //       '1f8b0800000000000403aa56ca2acecf2b2a4856b25232d23350d2512a4a2d2ecd2901720d2acc4c80fccc1420dbd0c858a916000000ffff03003f5f04832c000000',
    //     ],
    //     [
    //       'Content-Type',
    //       'application/json',
    //       'Transfer-Encoding',
    //       'chunked',
    //       'Connection',
    //       'close',
    //       'Date',
    //       'Wed, 10 May 2023 14:47:15 GMT',
    //       'Content-Encoding',
    //       'gzip',
    //       'Vary',
    //       'Accept-Encoding',
    //       'Front-End-Https',
    //       'on',
    //       'Access-Control-Allow-Origin',
    //       '*',
    //       'Access-Control-Allow-Credentials',
    //       'true',
    //       'Access-Control-Allow-Methods',
    //       'POST',
    //       'Access-Control-Allow-Headers',
    //       'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization',
    //       'Access-Control-Max-Age',
    //       '1728000',
    //       'X-Cache',
    //       'Miss from cloudfront',
    //       'Via',
    //       '1.1 7403235773a9b23f307196c589d62dac.cloudfront.net (CloudFront)',
    //       'X-Amz-Cf-Pop',
    //       'MXP63-P4',
    //       'X-Amz-Cf-Id',
    //       'tegMm-_pKKedzBQDLooaUPL8QTaQ3ykUz8JipI72Rf-dDVF5DKv0rg==',
    //     ],
    //   );
    try {
      await wallet_addEthereumChain({
        req: {
          params: [
            {
              ...correctParams,
              nativeCurrency: { symbol: 'xDai', decimals: 10 },
            },
          ],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided.`,
      );
    }
  });

  it('should report missing native currency symbol', async () => {
    // nock('https://rpc.gnosischain.com:443', { encodedQueryParams: true })
    //   .post('/', {
    //     id: '123',
    //     jsonrpc: '2.0',
    //     method: 'eth_chainId',
    //     params: [],
    //   })
    //   .reply(
    //     200,
    //     [
    //       '1f8b0800000000000403aa56ca2acecf2b2a4856b25232d23350d2512a4a2d2ecd2901720d2acc4c80fccc1420dbd0c858a916000000ffff03003f5f04832c000000',
    //     ],
    //     [
    //       'Content-Type',
    //       'application/json',
    //       'Transfer-Encoding',
    //       'chunked',
    //       'Connection',
    //       'close',
    //       'Date',
    //       'Wed, 10 May 2023 14:47:15 GMT',
    //       'Content-Encoding',
    //       'gzip',
    //       'Vary',
    //       'Accept-Encoding',
    //       'Front-End-Https',
    //       'on',
    //       'Access-Control-Allow-Origin',
    //       '*',
    //       'Access-Control-Allow-Credentials',
    //       'true',
    //       'Access-Control-Allow-Methods',
    //       'POST',
    //       'Access-Control-Allow-Headers',
    //       'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization',
    //       'Access-Control-Max-Age',
    //       '1728000',
    //       'X-Cache',
    //       'Miss from cloudfront',
    //       'Via',
    //       '1.1 7403235773a9b23f307196c589d62dac.cloudfront.net (CloudFront)',
    //       'X-Amz-Cf-Pop',
    //       'MXP63-P4',
    //       'X-Amz-Cf-Id',
    //       'tegMm-_pKKedzBQDLooaUPL8QTaQ3ykUz8JipI72Rf-dDVF5DKv0rg==',
    //     ],
    //   );
    try {
      await wallet_addEthereumChain({
        req: {
          params: [
            {
              ...correctParams,
              nativeCurrency: { symbol: null, decimals: 18 },
            },
          ],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected a string 'nativeCurrency.symbol'.`,
      );
    }
  });
});
