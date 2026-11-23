import { getLocal, type Mockttp } from 'mockttp';
import {
  combineMocks,
  defineApiMock,
  SPEC_MOCK_PRIORITY,
} from './define-api-mock.ts';
import { setupMockRequest } from './helpers/mockHelpers.ts';
import {
  API_MOCKS,
  accountsSupportedNetworksV2,
  bridgeGetTokens,
  priceSpotPricesV3,
  spotPrice,
} from './api-mocks.ts';

interface Item {
  name: string;
  nested: { a: number; b: number };
  list: string[];
}

const DEFAULT_ITEM: Item = {
  name: 'default',
  nested: { a: 1, b: 2 },
  list: ['x', 'y'],
};

const items = defineApiMock<Item, { id: number }>({
  id: 'items',
  url: /^https:\/\/example\.test\/items\/\d+$/,
  urlFor: ({ id }) => new RegExp(`^https://example\\.test/items/${id}$`),
  body: DEFAULT_ITEM,
});

describe('defineApiMock', () => {
  let server: Mockttp;

  const get = async (target: string): Promise<Item> => {
    const response = await fetch(
      `${server.url}/proxy?url=${encodeURIComponent(target)}`,
    );
    return (await response.json()) as Item;
  };

  beforeEach(async () => {
    server = getLocal();
    await server.start(0);
    // Stand-in for the MockServerE2E passthrough that serves DEFAULT_MOCKS.
    await server
      .forAnyRequest()
      .matching((request) => request.path.startsWith('/proxy'))
      .thenJson(200, { name: 'passthrough' });
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('response', () => {
    it('returns a copy of the default body', () => {
      items.response().nested.a = 99;

      expect(items.response()).toEqual(DEFAULT_ITEM);
    });

    it('deep-merges a partial and replaces arrays', () => {
      expect(items.response({ nested: { b: 20 }, list: ['z'] })).toEqual({
        name: 'default',
        nested: { a: 1, b: 20 },
        list: ['z'],
      });
    });

    it('lets a function return the whole body', () => {
      const body = { name: 'new', nested: { a: 0, b: 0 }, list: [] };

      expect(items.response(() => body)).toEqual(body);
    });
  });

  describe('matcher', () => {
    it('uses urlFor with params and url without', () => {
      expect(items.matcher()).toBe(items.url);
      expect(items.matcher({ id: 5 })).toEqual(
        /^https:\/\/example\.test\/items\/5$/,
      );
    });

    it('throws when params are given without urlFor', () => {
      const noUrlFor = defineApiMock<Item, { id: number }>({
        id: 'no-url-for',
        url: /x/u,
        body: DEFAULT_ITEM,
      });

      expect(() => noUrlFor.matcher({ id: 1 })).toThrow('has no urlFor');
    });
  });

  describe('mock', () => {
    it('serves the override on every request, over a default registered later', async () => {
      // MockServerE2E runs testSpecificMock first, then registers the global
      // default for the same URL at the same priority.
      await items.mock({ name: 'override' })(server);
      await setupMockRequest(server, {
        requestMethod: 'GET',
        url: items.url,
        response: { name: 'global default' },
        responseCode: 200,
      });

      const names = [];
      for (let i = 0; i < 3; i++) {
        names.push((await get('https://example.test/items/1')).name);
      }

      expect(names).toEqual(['override', 'override', 'override']);
    });

    it('is needed: a plain rule answers once, then the later default wins', async () => {
      for (const name of ['override', 'global default']) {
        await setupMockRequest(server, {
          requestMethod: 'GET',
          url: items.url,
          response: { name },
          responseCode: 200,
        });
      }

      const names = [];
      for (let i = 0; i < 3; i++) {
        names.push((await get('https://example.test/items/1')).name);
      }

      expect(names).toEqual(['override', 'global default', 'global default']);
    });

    it('serves the default body and leaves other URLs to the passthrough', async () => {
      await items.mock()(server);

      expect(await get('https://example.test/items/1')).toEqual(DEFAULT_ITEM);
      expect((await get('https://example.test/other')).name).toBe(
        'passthrough',
      );
    });

    it('matches one id when params are given', async () => {
      await combineMocks(
        items.mock({ name: 'one' }, { id: 1 }),
        items.mock({ name: 'two' }, { id: 2 }),
      )(server);

      expect((await get('https://example.test/items/1')).name).toBe('one');
      expect((await get('https://example.test/items/2')).name).toBe('two');
    });

    it('takes status and priority from options', async () => {
      await items.mock({ name: 'low' })(server);
      await items.mock({ name: 'high' }, undefined, {
        priority: SPEC_MOCK_PRIORITY + 1,
        status: 503,
      })(server);

      const response = await fetch(
        `${server.url}/proxy?url=${encodeURIComponent('https://example.test/items/1')}`,
      );

      expect(response.status).toBe(503);
      expect(((await response.json()) as Item).name).toBe('high');
    });
  });
});

describe('API_MOCKS', () => {
  it('matches the URL the app requests for each endpoint', () => {
    const requests: Record<keyof typeof API_MOCKS, string> = {
      priceSpotPricesV3:
        'https://price.api.cx.metamask.io/v3/spot-prices?assetIds=eip155:1/slip44:60',
      priceExchangeRatesV1:
        'https://price.api.cx.metamask.io/v1/exchange-rates?baseCurrency=usd',
      accountsSupportedNetworksV2:
        'https://accounts.api.cx.metamask.io/v2/supportedNetworks',
      accountsActiveNetworksV2:
        'https://accounts.api.cx.metamask.io/v2/activeNetworks?accountIds=a',
      accountsBalancesV2:
        'https://accounts.api.cx.metamask.io/v2/accounts/0x1/balances?networks=1',
      accountsMultiaccountBalancesV4:
        'https://accounts.api.cx.metamask.io/v4/multiaccount/balances?accountAddresses=0x1',
      accountsMultiaccountBalancesV5:
        'https://accounts.api.cx.metamask.io/v5/multiaccount/balances?accountIds=a',
      accountsMultiaccountBalancesV6:
        'https://accounts.api.cx.metamask.io/v6/multiaccount/balances?accountIds=a',
      tokenSupportedNetworksV2:
        'https://tokens.api.cx.metamask.io/v2/supportedNetworks',
      tokensAssetsV3:
        'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/erc20:0x1',
      bridgeGetTokens: 'https://bridge.api.cx.metamask.io/getTokens?chainId=1',
      bridgeGetTxStatus:
        'https://bridge.dev-api.cx.metamask.io/getTxStatus?a=b',
      gasSuggestedGasFees:
        'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
      rampsCountriesV2:
        'https://on-ramp-cache.api.cx.metamask.io/v2/regions/countries?action=buy',
      contentfulBanners:
        'https://cdn.contentful.com/spaces/s/entries?content_type=promotionalBanner',
    };

    const matched = Object.entries(requests).map(([key, url]) => [
      key,
      API_MOCKS[key as keyof typeof API_MOCKS].url.test(url),
    ]);

    expect(matched.filter(([, ok]) => !ok)).toEqual([]);
    expect(new Set(Object.values(API_MOCKS).map(({ id }) => id)).size).toBe(
      Object.keys(requests).length,
    );
  });

  it('keeps chain-specific bridge matchers apart', () => {
    const base = 'https://bridge.api.cx.metamask.io/getTokens?chainId=';
    const mainnet = bridgeGetTokens.matcher({ chainId: 1 }) as RegExp;

    expect(mainnet.test(`${base}1`)).toBe(true);
    expect(mainnet.test(`${base}1151111081099710`)).toBe(false);
  });

  it('applies spec overrides over the synced body', async () => {
    const server = getLocal();
    await server.start(0);
    try {
      await priceSpotPricesV3.mock(() => ({
        'eip155:1/slip44:60': spotPrice('eip155:1/slip44:60', 1926.42),
      }))(server);
      await accountsSupportedNetworksV2.mock({ partialSupport: [] })(server);
      const proxied = async (url: string) =>
        await (
          await fetch(`${server.url}/proxy?url=${encodeURIComponent(url)}`)
        ).json();

      expect(
        await proxied('https://price.api.cx.metamask.io/v3/spot-prices?a=b'),
      ).toEqual({
        'eip155:1/slip44:60': { id: 'eip155:1/slip44:60', price: 1926.42 },
      });
      expect(
        await proxied(
          'https://accounts.api.cx.metamask.io/v2/supportedNetworks',
        ),
      ).toEqual({
        ...accountsSupportedNetworksV2.response(),
        partialSupport: [],
      });
    } finally {
      await server.stop();
    }
  });
});
