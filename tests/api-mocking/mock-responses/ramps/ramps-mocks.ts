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
import {
  createRampsQuoteResponse,
  ProviderType,
} from './responses/ramps-quotes-response.ts';
import {
  TRANSAK_AUTH_LOGIN_RESPONSE,
  TRANSAK_AUTH_VERIFY_RESPONSE,
} from './transak/transak-auth-response.ts';
import { TRANSAK_QUOTE_RESPONSE } from './transak/transak-quotes-response.ts';
import {
  TRANSAK_USER_DETAILS_RESPONSE,
  TRANSAK_KYC_REQUIREMENT_RESPONSE,
  TRANSAK_USER_LIMITS_RESPONSE,
} from './transak/transak-user-response.ts';
import { TRANSAK_CREATE_ORDER_RESPONSE } from './transak/transak-order-response.ts';
import { TRANSAK_RAMPS_TRANSLATE_RESPONSE } from './transak/transak-ramps-translate-response.ts';
import { TRANSAK_PAYMENTS_OVERRIDE_RESPONSE } from './transak/transak-payments-override-response.ts';
import {
  BUY_ORDER_WIDGET_URL_RESPONSE,
  BUY_ORDER_CALLBACK_RESPONSE,
} from './responses/ramps-buy-order-checkout-response.ts';
import { createBuyOrderResponse } from './responses/ramps-buy-order-status-response.ts';
import { createDepositOrderResponse } from './responses/ramps-deposit-order-status-response.ts';

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
 *
 * @param providerType - 'native' for the Transak KYC flow, 'aggregator' for the widget/WebView flow.
 */
export const RAMPS_QUOTE_MOCKS = async (
  mockServer: Mockttp,
  providerType: ProviderType = 'native',
) => {
  const quoteResponse = createRampsQuoteResponse(providerType);
  await registerGetMocks(mockServer, [
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/providers\/all\/quote\?.*$/,
      responseCode: 200,
      response: quoteResponse,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/v2\/quotes\?.*$/,
      responseCode: 200,
      response: quoteResponse,
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
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/v2\/providers\/[^/]+\/buy(\?.*)?$/,
      responseCode: 200,
      response: BUY_ORDER_WIDGET_URL_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/v2\/providers\/[^/]+\/callback(\?.*)?$/,
      responseCode: 200,
      response: BUY_ORDER_CALLBACK_RESPONSE,
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

/**
 * Stateful order-status mock.
 * Returns PENDING on the first call, then COMPLETED on every subsequent call.
 * This lets tests observe the pending -> completed transition during order polling.
 */
export const BUY_ORDER_STATUS_MOCKS = async (mockServer: Mockttp) => {
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
        json: createBuyOrderResponse(status),
      };
    });
};

/**
 * Stateful deposit order-status mock for the native Transak flow.
 * Returns PENDING on the first call, then COMPLETED on every subsequent call.
 */
export const DEPOSIT_ORDER_STATUS_MOCKS = async (mockServer: Mockttp) => {
  let depositOrderCallCount = 0;
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      // Matches both the legacy TransakService endpoint (/providers/...) and the
      // v2 RampsService endpoint (/v2/providers/...) used by refreshOrder.
      return url.includes('providers/transak-native-staging/orders/');
    })
    .asPriority(1000)
    .thenCallback(() => {
      depositOrderCallCount++;
      const status = depositOrderCallCount <= 1 ? 'PENDING' : 'COMPLETED';
      return {
        statusCode: 200,
        json: createDepositOrderResponse(status),
      };
    });
};

/**
 * Mocks all Transak API endpoints for the native KYC + bank-transfer flow.
 * Covers: auth/login, auth/verify, lookup/quotes, user details, KYC requirement,
 * user limits, create order, ramps translation, and ramps orders (with stateful polling).
 *
 * Also overrides the payments mock to add isManualBankTransfer: true to debit-credit-card
 * so the flow takes the bank transfer path (avoiding the unmockable WebView).
 */
export const TRANSAK_NATIVE_FLOW_MOCKS = async (mockServer: Mockttp) => {
  // --- Transak API mocks (api-gateway-stg.transak.com) ---
  // All responses wrapped in { data: ... } because TransakService unwraps .data

  // POST auth/login — sendUserOtp(email)
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('api-gateway-stg.transak.com/api/v2/auth/login');
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: TRANSAK_AUTH_LOGIN_RESPONSE,
    }));

  // POST auth/verify — verifyUserOtp()
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('api-gateway-stg.transak.com/api/v2/auth/verify');
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: TRANSAK_AUTH_VERIFY_RESPONSE,
    }));

  // GET lookup/quotes — transakGetBuyQuote() internal Transak quote
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('api-gateway-stg.transak.com/api/v2/lookup/quotes');
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: TRANSAK_QUOTE_RESPONSE,
    }));

  // GET user/ — getUserDetails()
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('api-gateway-stg.transak.com/api/v2/user/');
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: TRANSAK_USER_DETAILS_RESPONSE,
    }));

  // GET kyc/requirement — getKycRequirement()
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('api-gateway-stg.transak.com/api/v2/kyc/requirement');
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: TRANSAK_KYC_REQUIREMENT_RESPONSE,
    }));

  // GET orders/user-limit — getUserLimits()
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes(
        'api-gateway-stg.transak.com/api/v2/orders/user-limit',
      );
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: TRANSAK_USER_LIMITS_RESPONSE,
    }));

  // POST orders — createOrder()
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return (
        url.includes('api-gateway-stg.transak.com/api/v2/orders') &&
        !url.includes('user-limit') &&
        !url.includes('payment-confirmation') &&
        !url.includes('active-orders')
      );
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: TRANSAK_CREATE_ORDER_RESPONSE,
    }));

  // GET orders/{id} — TransakService.getOrder() payment-details enrichment
  // Called after createOrder when an access token is present.
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return (
        url.includes('api-gateway-stg.transak.com/api/v2/orders/') &&
        !url.includes('user-limit') &&
        !url.includes('active-orders')
      );
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: { data: { orderId: 'mock-transak-order-123' } },
    }));

  // GET translate — getTranslation() (on-ramp.uat-api.cx.metamask.io)
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes(
        'on-ramp.uat-api.cx.metamask.io/providers/transak-native-staging/native/translate',
      );
    })
    .asPriority(999)
    .thenCallback(() => ({
      statusCode: 200,
      json: TRANSAK_RAMPS_TRANSLATE_RESPONSE,
    }));

  await DEPOSIT_ORDER_STATUS_MOCKS(mockServer);

  // Payments override — isManualBankTransfer: true for bank transfer path
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/v2\/regions\/[^/]+\/payments\?.*$/,
      response: TRANSAK_PAYMENTS_OVERRIDE_RESPONSE,
      responseCode: 200,
    },
    1000,
  );
};

/**
 * Sets up all on-ramp API mocks for a given region.
 * This is the main entry point used by test files.
 *
 * @param mockServer - The mock server instance
 * @param selectedRegion - The region selected in the test fixture
 * @param providerType - 'native' for the Transak KYC/OTP flow, 'aggregator' for the widget/WebView flow. Defaults to 'native'.
 */
export const setupRegionAwareOnRampMocks = async (
  mockServer: Mockttp,
  selectedRegion: RampsRegion,
  providerType: ProviderType = 'native',
) => {
  await RAMPS_REGION_MOCKS(mockServer, selectedRegion);
  await RAMPS_CATALOG_MOCKS(mockServer);
  await RAMPS_QUOTE_MOCKS(mockServer, providerType);
  await RAMPS_CHECKOUT_MOCKS(mockServer);
  await RAMPS_TOKEN_ICON_MOCKS(mockServer);
};
