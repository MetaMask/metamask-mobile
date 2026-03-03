import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../helpers/mockHelpers.ts';
import { MockApiEndpoint, RampsRegion } from '../../../framework/types.ts';
import { getDecodedProxiedURL } from '../../../smoke/notifications/utils/helpers.ts';
import { RAMPS_NETWORKS_RESPONSE } from './responses/ramps-networks-response.ts';
import { RAMPS_COUNTRIES_RESPONSE } from './responses/ramps-countries-response.ts';
import {
  RAMPS_REGION_CONFIG_RESPONSE,
  RAMPS_AMOUNT_RESPONSE,
} from './responses/ramps-region-config-response.ts';
import { RAMPS_TOP_TOKENS_RESPONSE } from './responses/ramps-tokens-response.ts';
import { RAMPS_PROVIDERS_RESPONSE } from './responses/ramps-providers-response.ts';
import { RAMPS_PAYMENTS_V2_RESPONSE } from './responses/ramps-payments-response.ts';
import { createGeolocationResponse } from './responses/ramps-geolocation.ts';
import { RAMPS_QUOTE_RESPONSE } from './responses/ramps-quotes-response.ts';

/** Registers an array of static GET mocks in parallel. */
const registerGetMocks = (mockServer: Mockttp, mocks: MockApiEndpoint[]) =>
  Promise.all(
    mocks.map((mock) =>
      setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: mock.urlEndpoint,
        response: mock.response,
        responseCode: mock.responseCode,
      }),
    ),
  );

/**
 * Geolocation + region eligibility mocks.
 * Returns the detected country and confirms buy/sell/deposit eligibility.
 */
export const RAMPS_REGION_MOCKS = async (
  mockServer: Mockttp,
  selectedRegion: RampsRegion,
) => {
  const geolocationResponse = createGeolocationResponse(selectedRegion);

  await registerGetMocks(mockServer, [
    ...geolocationResponse,
    {
      urlEndpoint:
        /^https:\/\/on-ramp-content\.uat-api\.cx\.metamask\.io\/regions\/countries\/[^/]+$/,
      responseCode: 200,
      response: { global: true, deposit: true, aggregator: true },
    },
  ]);
};

/**
 * Catalog data mocks — networks, countries, region config, amount conversion,
 * tokens, providers, and payment methods.
 */
export const RAMPS_CATALOG_MOCKS = async (mockServer: Mockttp) => {
  await registerGetMocks(mockServer, [
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/networks\?.*$/,
      responseCode: 200,
      response: RAMPS_NETWORKS_RESPONSE,
    },
    // Countries (V1 + V2)
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io(\/v2)?\/regions\/countries\?.*$/,
      responseCode: 200,
      response: RAMPS_COUNTRIES_RESPONSE,
    },
    // Region config (payment methods, crypto/fiat options, limits)
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/[^/]+\/light\?.*$/,
      responseCode: 200,
      response: RAMPS_REGION_CONFIG_RESPONSE,
    },
    // Amount conversion
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/currencies\/crypto\/.*\/amount\?.*$/,
      responseCode: 200,
      response: RAMPS_AMOUNT_RESPONSE,
    },
    // Top tokens V2
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/v2\/regions\/[^/]+\/topTokens\?.*$/,
      responseCode: 200,
      response: RAMPS_TOP_TOKENS_RESPONSE,
    },
    // Providers V2
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/v2\/regions\/[^/]+\/providers\?.*$/,
      responseCode: 200,
      response: RAMPS_PROVIDERS_RESPONSE,
    },
    // Tokens (legacy)
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/[^/]+\/tokens\?.*$/,
      responseCode: 200,
      response: RAMPS_TOP_TOKENS_RESPONSE,
    },
    // Payments V2
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/v2\/regions\/[^/]+\/payments\?.*$/,
      responseCode: 200,
      response: RAMPS_PAYMENTS_V2_RESPONSE,
    },
    // Tokens fallback (handles malformed region paths from legacy useRampTokens)
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/.*\/tokens\?.*$/,
      responseCode: 200,
      response: RAMPS_TOP_TOKENS_RESPONSE,
    },
  ]);
};

/**
 * Quote mocks for V1 and V2 endpoints.
 * Returns a single transak-staging quote so the controller auto-selects it.
 */
export const RAMPS_QUOTE_MOCKS = async (mockServer: Mockttp) => {
  await registerGetMocks(mockServer, [
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/providers\/all\/quote\?.*$/,
      responseCode: 200,
      response: RAMPS_QUOTE_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/v2\/quotes\?.*$/,
      responseCode: 200,
      response: RAMPS_QUOTE_RESPONSE,
    },
  ]);
};

/**
 * Checkout flow mocks — buy widget URL and callback endpoints.
 * After a quote is selected, RampsController.syncWidgetUrl() fetches the widget URL,
 * then getOrderFromCallback() extracts the order ID from the provider callback.
 */
export const RAMPS_CHECKOUT_MOCKS = async (mockServer: Mockttp) => {
  await registerGetMocks(mockServer, [
    // Buy widget URL — returns a staging callback URL so the WebView
    // immediately triggers the "order complete" flow.
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/v2\/providers\/[^/]+\/buy(\?.*)?$/,
      responseCode: 200,
      response: {
        url: 'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback?orderId=mock-order-123',
        browser: 'APP_BROWSER',
        orderId: null,
      },
    },
    // Callback — extracts order ID from provider callback URL
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/v2\/providers\/[^/]+\/callback(\?.*)?$/,
      responseCode: 200,
      response: { id: 'mock-order-123' },
    },
  ]);
};

/**
 * Token icon mocks (GET + HEAD) for UAT static assets.
 */
export const RAMPS_TOKEN_ICON_MOCKS = async (mockServer: Mockttp) => {
  const iconPattern =
    /^https:\/\/uat-static\.cx\.metamask\.io\/api\/v2\/tokenIcons\/assets\/.*\.png$/;

  await Promise.all([
    setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: iconPattern,
      response: '',
      responseCode: 200,
    }),
    setupMockRequest(mockServer, {
      requestMethod: 'HEAD',
      url: iconPattern,
      response: '',
      responseCode: 200,
    }),
  ]);
};

/** Builds a full order response object for the given status. */
const buildOrderResponse = (status: string) => ({
  id: 'mock-order-123',
  isOnlyLink: false,
  success: status === 'COMPLETED',
  cryptoAmount: '0.00355373',
  fiatAmount: 15,
  cryptoCurrency: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
  },
  fiatCurrency: {
    symbol: 'USD',
    name: 'US Dollar',
    decimals: 2,
    denomSymbol: '$',
  },
  provider: {
    id: '/providers/transak-staging',
    name: 'Transak (Staging)',
  },
  providerOrderId: 'mock-order-123',
  providerOrderLink: '',
  createdAt: Date.now(),
  totalFeesFiat: 3.5,
  txHash: status === 'COMPLETED' ? '0xmocktxhash123' : null,
  walletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
  status,
  network: {
    name: 'Ethereum Mainnet',
    chainId: '1',
  },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: 'Usually completes in a few minutes',
  orderType: 'BUY',
  exchangeRate: 4072.34,
});

/**
 * Stateful order-status mock.
 * Returns PENDING on the first call, then COMPLETED on every subsequent call.
 * This lets tests observe the pending -> completed transition during order polling.
 */
export const RAMPS_ORDER_STATUS_MOCKS = async (mockServer: Mockttp) => {
  const orderUrlPattern =
    /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/v2\/providers\/[^/]+\/orders\/[^/]+(\?.*)?$/;

  let orderCallCount = 0;

  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return orderUrlPattern.test(url);
    })
    .asPriority(999)
    .thenCallback((_) => {
      orderCallCount++;
      const status = orderCallCount <= 1 ? 'PENDING' : 'COMPLETED';
      return {
        statusCode: 200,
        json: buildOrderResponse(status),
      };
    });
};

/**
 * Sets up all on-ramp API mocks for a given region.
 * This is the main entry point used by test files.
 *
 * @param mockServer - The mock server instance
 * @param selectedRegion - The region selected in the test fixture
 */
export const setupRegionAwareOnRampMocks = async (
  mockServer: Mockttp,
  selectedRegion: RampsRegion,
) => {
  await RAMPS_REGION_MOCKS(mockServer, selectedRegion);
  await RAMPS_CATALOG_MOCKS(mockServer);
  await RAMPS_QUOTE_MOCKS(mockServer);
  await RAMPS_CHECKOUT_MOCKS(mockServer);
  await RAMPS_TOKEN_ICON_MOCKS(mockServer);
  await RAMPS_ORDER_STATUS_MOCKS(mockServer);
};
