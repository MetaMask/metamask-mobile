import type { Mockttp } from 'mockttp';
import { RELAY_QUOTE_MOCK, RELAY_STATUS_MOCK } from '../transaction-pay';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder';

export interface RelayQuoteToken {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
  logoURI?: string;
}

export interface RelayQuoteParams {
  srcChainId: number;
  srcToken: RelayQuoteToken;
  dstChainId: number;
  dstToken: RelayQuoteToken;
  amountIn: string;
  amountOut: string;
  amountUsd: string;
  recipient?: string;
  timeEstimate?: number;
  totalImpactUsd?: string;
}

/**
 * Builds a parametrizable relay quote mock payload derived from the standard RELAY_QUOTE_MOCK shape.
 */
export function buildRelayQuoteMock(
  params: RelayQuoteParams,
): Record<string, unknown> {
  const quote = JSON.parse(JSON.stringify(RELAY_QUOTE_MOCK));

  quote.details.currencyIn = {
    currency: {
      chainId: params.srcChainId,
      address: params.srcToken.address,
      symbol: params.srcToken.symbol,
      name: params.srcToken.name ?? params.srcToken.symbol,
      decimals: params.srcToken.decimals,
      metadata: {
        logoURI: params.srcToken.logoURI ?? '',
        verified: true,
      },
    },
    amount: params.amountIn,
    amountFormatted: (
      Number(params.amountIn) /
      10 ** params.srcToken.decimals
    ).toString(),
    amountUsd: params.amountUsd,
    minimumAmount: params.amountIn,
  };

  quote.details.currencyOut = {
    currency: {
      chainId: params.dstChainId,
      address: params.dstToken.address,
      symbol: params.dstToken.symbol,
      name: params.dstToken.name ?? params.dstToken.symbol,
      decimals: params.dstToken.decimals,
      metadata: {
        logoURI: params.dstToken.logoURI ?? '',
        verified: true,
      },
    },
    amount: params.amountOut,
    amountFormatted: (
      Number(params.amountOut) /
      10 ** params.dstToken.decimals
    ).toString(),
    amountUsd: params.amountUsd,
    minimumAmount: params.amountOut,
  };

  quote.details.timeEstimate = params.timeEstimate ?? 30;
  if (params.totalImpactUsd !== undefined) {
    quote.details.totalImpact = {
      usd: params.totalImpactUsd,
      percent: '0.1',
    };
  }

  if (quote.steps && Array.isArray(quote.steps)) {
    for (const step of quote.steps) {
      if (step.items && Array.isArray(step.items)) {
        for (const item of step.items) {
          if (item.data) {
            item.data.from = params.recipient ?? DEFAULT_FIXTURE_ACCOUNT;
            item.data.chainId = params.srcChainId;
          }
        }
      }
    }
  }

  if (params.recipient) {
    quote.details.recipient = params.recipient;
  }

  quote.details.route = [
    {
      action: 'send',
      currency: quote.details.currencyIn.currency,
      amount: quote.details.currencyIn.amount,
      amountUsd: quote.details.currencyIn.amountUsd,
    },
    {
      action: 'receive',
      currency: quote.details.currencyOut.currency,
      amount: quote.details.currencyOut.amount,
      amountUsd: quote.details.currencyOut.amountUsd,
    },
  ];

  return quote;
}

/**
 * Registers the mock server interceptors for Relay quote requests with the given quote object.
 */
export async function mockRelayQuoteWith(mockServer: Mockttp, quote: unknown) {
  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url?.includes('api.relay.link/quote') ||
          url?.includes('bridge.api.cx.metamask.io/relay/quote') ||
          url?.includes('bridge.dev-api.cx.metamask.io/relay/quote') ||
          url?.includes('intents.api.cx.metamask.io/relay/quote') ||
          url?.includes('intents.uat-api.cx.metamask.io/relay/quote'),
      );
    })
    .thenCallback(() => ({ statusCode: 200, json: quote }));

  await mockServer
    .forPost(/intents\.(uat-)?api\.cx\.metamask\.io\/relay\/quote/)
    .asPriority(1001)
    .thenCallback(() => ({ statusCode: 200, json: quote }));
}

interface RelayRequestBody {
  metamask?: { executeVersion?: number };
  requestId?: string;
  user?: string;
}

const RELAY_QUOTE_URL_PATTERN =
  /intents\.(uat-)?api\.cx\.metamask\.io\/relay\/quote/;
const RELAY_EXECUTE_URL_PATTERN =
  /intents\.(uat-)?api\.cx\.metamask\.io\/relay\/execute/;
const RELAY_EXECUTE_SIGNATURE = 'money-account-withdraw-e2e-signature';

async function readRelayRequestBody(request: {
  body: { getText: () => Promise<string | undefined> };
}): Promise<RelayRequestBody> {
  try {
    const text = await request.body.getText();
    return text ? (JSON.parse(text) as RelayRequestBody) : {};
  } catch {
    return {};
  }
}

/**
 * Registers Relay quote mocks that serve an execute quote to `executeUser`
 * when it asks for one, and the plain `quote` otherwise. Also mocks
 * `/relay/execute`, echoing the quote's request id.
 */
export async function mockRelayQuoteWithExecute(
  mockServer: Mockttp,
  quote: Record<string, unknown>,
  executeUser: string,
) {
  const handler = async (request: {
    body: { getText: () => Promise<string | undefined> };
  }) => {
    const body = await readRelayRequestBody(request);
    const isExecute =
      Boolean(body.metamask?.executeVersion) &&
      body.user?.toLowerCase() === executeUser.toLowerCase();

    if (!isExecute) {
      return { statusCode: 200, json: quote };
    }

    const executeQuote = JSON.parse(JSON.stringify(quote));
    executeQuote.metamask = {
      ...executeQuote.metamask,
      isExecute: true,
      signature: RELAY_EXECUTE_SIGNATURE,
    };
    for (const step of executeQuote.steps ?? []) {
      for (const item of step.items ?? []) {
        if (item.data) {
          item.data.from = body.user;
        }
      }
    }
    return { statusCode: 200, json: executeQuote };
  };

  const executeHandler = async (request: {
    body: { getText: () => Promise<string | undefined> };
  }) => {
    const body = await readRelayRequestBody(request);
    return { statusCode: 200, json: { requestId: body.requestId } };
  };

  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url?.includes('api.relay.link/quote') ||
          url?.includes('bridge.api.cx.metamask.io/relay/quote') ||
          url?.includes('bridge.dev-api.cx.metamask.io/relay/quote') ||
          (url && RELAY_QUOTE_URL_PATTERN.test(url)),
      );
    })
    .thenCallback(handler);

  await mockServer
    .forPost(RELAY_QUOTE_URL_PATTERN)
    .asPriority(1001)
    .thenCallback(handler);

  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(url && RELAY_EXECUTE_URL_PATTERN.test(url));
    })
    .thenCallback(executeHandler);

  await mockServer
    .forPost(RELAY_EXECUTE_URL_PATTERN)
    .asPriority(1001)
    .thenCallback(executeHandler);
}

/**
 * Registers the mock server interceptors for Relay status (success) requests.
 */
export async function mockRelayStatusSuccess(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(
        url?.includes('api.relay.link/intents/status') ||
          url?.includes('bridge.api.cx.metamask.io/relay/intents/status') ||
          url?.includes('bridge.dev-api.cx.metamask.io/relay/intents/status') ||
          url?.includes('intents.api.cx.metamask.io/relay/intents/status') ||
          url?.includes('intents.uat-api.cx.metamask.io/relay/intents/status'),
      );
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: RELAY_STATUS_MOCK,
    }));

  await mockServer
    .forGet(/intents\.(uat-)?api\.cx\.metamask\.io\/relay\/intents\/status/)
    .asPriority(1001)
    .thenCallback(() => ({
      statusCode: 200,
      json: RELAY_STATUS_MOCK,
    }));
}

/**
 * Mocks the Relay /authorize endpoint used by the HyperLiquid 2-step
 * withdrawal flow (EIP-712 nonce-mapping signature POST). The response body
 * is only logged by the submitter, so an empty JSON object suffices.
 */
export async function mockRelayAuthorize(mockServer: Mockttp) {
  const handler = () => ({ statusCode: 200, json: {} });

  await mockServer
    .forPost('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(url?.includes('api.relay.link/authorize'));
    })
    .thenCallback(handler);

  await mockServer
    .forPost(/api\.relay\.link\/authorize/)
    .asPriority(1001)
    .thenCallback(handler);
}
