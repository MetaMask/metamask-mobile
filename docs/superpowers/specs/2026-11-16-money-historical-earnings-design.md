# Money Historical Earnings Hook

## Goal

Add `useMoneyHistoricalEarnings` for the Money Earnings prototype. The hook
fetches historical vault earnings from:

`GET /v1/positions/:address/interest-history?chain_id={chainId}`

The implementation is intentionally temporary. The installed
`MoneyAccountApiDataService` does not yet expose this endpoint.

## Architecture

Create one hook file at:

`app/components/UI/Money/hooks/useMoneyHistoricalEarnings.ts`

The file contains:

- The TypeScript response model supplied for the endpoint.
- A local fetcher that:
  - derives the Money API base URL from `ApiEnv`, using the same dev/UAT/prod
    hosts as the current Money API service;
  - lowercases the account address in the path;
  - sends the `AuthenticationController` bearer token when available;
  - throws for non-2xx responses;
  - returns the decoded `InterestHistoryResponse`.
- `useMoneyHistoricalEarnings`, which:
  - reads the primary Money account and Money vault configuration from existing
    selectors;
  - converts the configured chain ID to a safe number;
  - disables the query when address or chain ID is unavailable;
  - uses a stable query key containing the normalized address and chain ID;
  - returns the TanStack Query result directly.

The hook file includes a TODO explaining that the local fetcher must be
replaced by a `MoneyAccountApiDataService` call once `money-account-api`
supports `/interest-history`.

Add a dedicated query-key constant under
`MoneyAccountApiDataServiceQueryKeys` so future service-backed queries and
cache invalidation can reuse the same namespace.

## Data flow

```text
Redux primary account + vault config
        ↓
useMoneyHistoricalEarnings
        ↓
TanStack Query key: [fetchInterestHistory, address, chainId]
        ↓
local authenticated GET /v1/positions/:address/interest-history
        ↓
InterestHistoryResponse
```

No transformation or numeric conversion occurs in the hook. Domain values
remain serialized strings, preserving the API contract.

## Error handling

- Missing address or invalid chain ID disables the query.
- HTTP failures reject the query and remain visible through TanStack Query.
- JSON is returned as the declared response type; no placeholder data or
  silent fallback is introduced.
- The query uses no local error swallowing.

## Testing

Add focused unit tests beside the hook. Mock:

- `@tanstack/react-query`;
- `react-redux`;
- `Engine`;
- `fetch`.

Cover:

1. Query key and enabled state with valid account/vault data.
2. Disabled query when account data is missing.
3. Disabled query when vault chain ID is invalid.
4. Fetcher URL, lowercase address, chain ID, and bearer header.
5. Returned response from a successful request.
6. Rejection from a non-2xx response.

Tests use explicit assertions, AAA structure, and no real API requests.

## Scope

Included:

- New hook and endpoint response types.
- Co-located temporary fetcher.
- Query-key constant.
- Hook unit tests.

Excluded:

- Changes to `MoneyAccountApiDataService` or `money-account-api`.
- Earnings view rendering.
- Navigation changes.
- Runtime response validation beyond HTTP status handling.
