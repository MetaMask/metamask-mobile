export type CrossmintEnvironment = 'staging' | 'production';

export interface CrossmintTokenFeatures {
  creditCardPayment: boolean;
}

export interface CrossmintTokenAvailability {
  token: string;
  available: boolean;
  features: CrossmintTokenFeatures;
}

export interface CrossmintTokensResponse {
  nextCursor?: string;
  previousCursor?: string;
  data: CrossmintTokenAvailability[];
}

export interface CrossmintMemecoinToken {
  tokenLocator: string;
  chain: string;
  address: string;
  available: boolean;
  creditCardPayment: boolean;
  name: string;
  symbol: string;
  imageUrl?: string;
}

export interface CrossmintCreateOrderParams {
  tokenLocator: string;
  amountUsd: string;
  walletAddress: string;
  receiptEmail?: string;
  maxSlippageBps?: string;
}

export interface CrossmintOrderQuotePrice {
  amount: string;
  currency: string;
}

export interface CrossmintOrder {
  orderId: string;
  phase?: string;
  payment?: {
    status?: string;
    failureReason?: {
      message?: string;
    };
  };
  quote?: {
    status?: string;
    expiresAt?: string;
    totalPrice?: CrossmintOrderQuotePrice;
  };
  lineItems?: Array<{
    chain?: string;
    metadata?: {
      name?: string;
      description?: string;
      imageUrl?: string;
    };
    quote?: {
      status?: string;
      quantityRange?: {
        lowerBound?: string;
        upperBound?: string;
      };
      unavailabilityReason?: {
        message?: string;
      };
    };
  }>;
}

export interface CrossmintCreateOrderResponse {
  clientSecret: string;
  order: CrossmintOrder;
}

export type CrossmintCheckoutEventName =
  | 'order:updated'
  | 'order:creation-failed'
  | 'ui:express-checkout.ready'
  | 'ui:height.changed';

export interface CrossmintCheckoutMessage {
  event: CrossmintCheckoutEventName | string;
  data?: {
    order?: CrossmintOrder;
    orderClientSecret?: string;
    height?: number;
    message?: string;
  };
}
