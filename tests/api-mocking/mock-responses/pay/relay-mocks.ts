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
            if (params.srcChainId === params.dstChainId) {
              item.data.chainId = params.srcChainId;
            }
          }
        }
      }
    }
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
    .thenCallback(() => ({
      statusCode: 200,
      json: quote,
    }));

  await mockServer
    .forPost(/intents\.(uat-)?api\.cx\.metamask\.io\/relay\/quote/)
    .thenCallback(() => ({
      statusCode: 200,
      json: quote,
    }));
}

/**
 * Registers the mock server interceptors for Relay status (success) requests.
 */
export async function mockRelayStatusSuccess(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
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
    .thenCallback(() => ({
      statusCode: 200,
      json: RELAY_STATUS_MOCK,
    }));
}
