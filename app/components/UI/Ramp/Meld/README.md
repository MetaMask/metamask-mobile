# Meld Direct Integration PoC

## Overview

This is a Proof of Concept exploring what it would look like to **replace the current on-ramp aggregator stack** with [Meld's White-Label API](https://docs.meld.io/docs/whitelabel-api-guide) as a direct integration.

## Problem Statement

The current ramp architecture has **3 layers of abstraction**:

```
┌───────────────────┐     ┌───────────────────┐     ┌────────────────┐
│  MetaMask Mobile   │     │   on-ramp API      │     │   Providers     │
│                   │     │   (NestJS)         │     │                │
│  @consensys/      │────▶│  Aggregates 25+    │────▶│  Transak       │
│  on-ramp-sdk      │     │  providers with    │     │  Moonpay       │
│                   │     │  generic/custom    │     │  Banxa         │
│  @metamask/       │     │  adapters          │     │  Robinhood     │
│  ramps-controller │     │                   │     │  Sardine       │
│                   │     │  Already uses Meld │     │  Unlimit       │
│                   │     │  as sub-aggregator │     │  ...           │
│                   │     │  for ~8 providers  │     │                │
└───────────────────┘     └───────────────────┘     └────────────────┘
```

**Key observation**: The on-ramp API already routes ~8 providers through Meld's API
(TransfiMeld, UnlimitMeld, Robinhood, Fonbnk, Koywe, Bilira, BlockchainDotCom, BinanceConnect).
Meld is already a sub-aggregator inside the system.

## Proposed Architecture

```
┌───────────────────┐     ┌────────────────────┐     ┌────────────────┐
│  MetaMask Mobile   │     │   Meld API          │     │   Providers     │
│                   │     │                    │     │                │
│  MeldApi service  │────▶│  Aggregates all    │────▶│  Transak       │
│  (direct REST)    │     │  providers directly │     │  Moonpay       │
│                   │     │                    │     │  Robinhood     │
│  React Hooks      │     │  Returns quotes    │     │  Unlimit       │
│  + Context        │     │  with customerScore │     │  Banxa         │
│                   │     │  for ranking        │     │  BTC Direct    │
│                   │     │                    │     │  ...           │
└───────────────────┘     └────────────────────┘     └────────────────┘
```

**Eliminates**: `@consensys/on-ramp-sdk`, `@consensys/native-ramps-sdk`, the on-ramp API server,
and most of `@metamask/ramps-controller`.

## File Structure

```
app/components/UI/Ramp/Meld/
├── README.md                           # This file
├── index.tsx                           # Entry point with nav stack
├── MeldProvider.tsx                    # React Context (replaces RampSDKProvider)
│
├── api/
│   ├── MeldApi.ts                     # Meld REST API client
│   └── index.ts                       # Singleton instance
│
├── types/
│   └── index.ts                       # All Meld API types
│
├── hooks/
│   ├── index.ts                       # Barrel export
│   ├── useMeldApi.ts                  # Generic async state hook
│   ├── useMeldCountries.ts            # Countries → replaces useRegions
│   ├── useMeldFiatCurrencies.ts       # Fiat currencies → replaces useFiatCurrencies
│   ├── useMeldCryptoCurrencies.ts     # Crypto currencies → replaces useCryptoCurrencies
│   ├── useMeldPaymentMethods.ts       # Payment methods → replaces usePaymentMethods
│   ├── useMeldQuotes.ts              # Quotes → replaces useQuotes + useSortedQuotes
│   └── useMeldWidgetSession.ts        # Widget session → replaces buy-widget URL gen
│
└── Views/
    ├── BuildQuote/
    │   └── MeldBuildQuote.tsx          # Amount + selection screen
    └── Quotes/
        └── MeldQuotes.tsx             # Quote comparison + checkout launch
```

## Hook-to-Hook Mapping

| Old (Aggregator)             | New (Meld)                | Meld API Endpoint                                     |
| ---------------------------- | ------------------------- | ----------------------------------------------------- |
| `useRegions`                 | `useMeldCountries`        | `GET /service-providers/properties/countries`         |
| `useFiatCurrencies`          | `useMeldFiatCurrencies`   | `GET /service-providers/properties/fiat-currencies`   |
| `useCryptoCurrencies`        | `useMeldCryptoCurrencies` | `GET /service-providers/properties/crypto-currencies` |
| `usePaymentMethods`          | `useMeldPaymentMethods`   | `GET /service-providers/properties/payment-methods`   |
| `useQuotes`                  | `useMeldQuotes`           | `POST /payments/crypto/quote`                         |
| `useSortedQuotes`            | (built-in)                | Meld returns `customerScore` for ranking              |
| `useInAppBrowser` (checkout) | `useMeldWidgetSession`    | `POST /crypto/session/widget`                         |
| `RampSDKProvider`            | `MeldSDKProvider`         | Context only (no SDK initialization)                  |

## API Flow Comparison

### Old Flow: Getting Quotes

```
1. RampSDKProvider creates OnRampSdk instance
2. SDK.regions() → fetches /regions/countries (on-ramp API)
3. SDK caches region data with providers, payments, fiat, crypto
4. useQuotes calls sdk.getQuotes(region, payment, crypto, fiat, amount)
5. SDK filters providers by compatibility
6. SDK calls on-ramp API: GET /{providerId}/quote for EACH provider (N calls)
7. On-ramp API calls each provider's external API
8. On-ramp API returns quotes
9. SDK aggregates responses, handles errors
10. useSortedQuotes sorts by price or reliability
11. UI renders quotes
```

### New Flow: Getting Quotes

```
1. MeldSDKProvider sets up React context
2. useMeldCountries → GET /service-providers/properties/countries
3. useMeldFiatCurrencies → GET /service-providers/properties/fiat-currencies
4. useMeldCryptoCurrencies → GET /service-providers/properties/crypto-currencies
5. useMeldQuotes → POST /payments/crypto/quote (ONE call, all providers)
6. Meld returns quotes pre-sorted by customerScore
7. UI renders quotes
```

**Result**: 7 steps instead of 11. One API call for quotes instead of N.

## Key Differences

### Quote Ranking

- **Old**: Sort by price or reliability (client-side heuristic)
- **New**: Sort by `customerScore` — Meld's ML-based score factoring in conversion rates,
  provider reliability, location, and payment method compatibility

### Provider Management

- **Old**: Each provider needs a custom adapter in the on-ramp API, CI/CD deployment
  to add/remove providers, MetaMask team manages provider onboarding
- **New**: Meld auto-manages providers — can add/remove based on performance,
  compliance, and coverage. Contact Meld for manual control.

### Error Handling

- **Old**: N provider calls = N potential failures, each handled individually
- **New**: One call returns all quotes, errors are per-quote within the response

## Security Considerations

**IMPORTANT**: Meld's API key must NOT be exposed in the mobile app bundle.

For this PoC, we call the sandbox API directly from the app. In production:

```
Mobile App → MetaMask Backend Proxy → Meld API
```

The proxy would:

1. Authenticate the mobile app (existing auth flow)
2. Add the Meld API key server-side
3. Forward requests to Meld
4. Return responses to the app

This is similar to how the current on-ramp API works, but the proxy would be
much simpler (just forwarding + auth) vs. the full aggregation logic.

## Running the PoC

1. Add your Meld sandbox API key to `.js.env`:

   ```
   export MELD_API_KEY="your_sandbox_api_key_here"
   ```

2. The PoC can be accessed by navigating to the `MeldRampFlow` component.
   For quick testing, you can temporarily modify the ramp entry point or
   add a dev menu option.

3. The flow: BuildQuote → Quotes → Provider Checkout (opens in browser)

## What Would Full Production Integration Look Like?

1. **Backend Proxy**: Simple API proxy service (replaces on-ramp API complexity)
2. **Redux Integration**: Map Meld orders to existing `fiatOrders` reducer
3. **Order Polling**: Use Meld webhooks + polling for transaction status
4. **Navigation**: Wire into existing `Routes.RAMP.*` navigation structure
5. **Analytics**: Map Meld events to existing analytics pipeline
6. **Error Handling**: Map Meld error codes to user-friendly messages
7. **Caching**: Cache static data (countries, currencies) for 1 week
8. **Testing**: E2E tests using Meld sandbox + test credentials

## Dependencies That Could Be Removed

If Meld replaces the aggregator entirely:

- `@consensys/on-ramp-sdk` (2.1.12) — SDK for on-ramp API
- `@consensys/native-ramps-sdk` (2.1.7) — Native ramps SDK
- `@metamask/ramps-controller` (4.1.0) — Partial removal (still needed for some state)
- The on-ramp API server infrastructure entirely

## Tradeoffs

### Benefits

- Dramatically simpler architecture (3 layers → 1 layer)
- Single API call for quotes vs. N parallel calls
- Meld handles provider compliance & onboarding
- Better ranking via ML-based customerScore
- Less code to maintain in MetaMask repos
- Faster quote response times

### Risks

- **Vendor lock-in**: Full dependency on Meld for aggregation
- **API key security**: Requires backend proxy for production
- **Coverage gaps**: Meld may not cover all current providers
- **Pricing**: Meld takes a fee per transaction (partnerFee in quotes)
- **Control**: Less granular control over individual provider integrations
- **Migration**: Existing order history uses different data model
