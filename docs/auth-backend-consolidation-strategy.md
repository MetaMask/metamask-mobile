# Architecture Proposal #49: Auth Backend Consolidation Strategy

## Objective

Eliminate MetaMask's dependency on the current custom `auth-service` as the login gateway by moving provider authentication into `authentication-api` and/or Kratos, while repurposing `auth-service` as a narrow token-minting proxy.

Primary outcomes:

- single authentication entry point for future providers
- incremental migration path for Google, Apple, Telegram, WeChat, and future methods
- no TOPRF JWKS rotation
- no vault migration
- no live migration of refresh-token storage

## Problem Statement

MetaMask currently operates two overlapping authentication systems:

- `authentication-api`
  - issues `id_token`s for SRP and SIWE
  - exchanges them with Hydra for API access tokens
- `auth-service`
  - handles Google and Apple OAuth
  - issues its own signed `id_token`
  - manages refresh and revoke token lifecycle

This split increases infrastructure and operational cost, duplicates ownership across teams, and forces clients to integrate with more than one auth backend.

## Key Insight

`auth-service` signs its own `id_token`; it does not forward raw Google or Apple tokens to TOPRF. TOPRF trusts `auth-service`'s signing key, not the upstream provider.

Because of that, the upstream authentication method can change without forcing a TOPRF JWKS rotation or a vault migration, as long as `auth-service` remains the minting boundary for the final token format.

## Accepted Proposal

### Option C: `auth-service` becomes a proxy / token minter for `authentication-api` and Kratos

All authentication moves incrementally out of `auth-service`.

- `authentication-api` and/or Kratos become the systems that validate user credentials
- Hydra remains the access-token issuer for API access
- `auth-service` is repurposed into a focused `/mint` service that turns upstream auth into the existing Web3Auth-compatible token shape used by TOPRF and vault flows

### Target Flow

```text
User (any provider)
  -> authentication-api or Kratos
     validates credential
     supports SRP, SIWE, Telegram, WeChat, Google, Apple
  -> Hydra
     exchanges JWT for API access token
     adds web3auth_user_id to the token
  -> auth-service /mint
     validates upstream auth token
     mints Web3Auth-compatible auth tokens
  -> TOPRF / nodes
     same token format as today
  -> Vault
     same key derivation as today
  -> Derive SRP
  -> background SRP auth
  -> create / pair user profile
```

## Why This Option Was Chosen

- no TOPRF JWKS update
- no vault migration
- no live credential migration from `auth-service`
- supports incremental provider-by-provider rollout
- keeps existing token shape stable for current users and downstream systems
- enables new providers like Telegram and WeChat without a big-bang migration

## Tradeoffs

- login adds an extra hop: `authentication-api -> Hydra -> auth-service /mint`
- `auth-service` is not removed; it is permanently narrowed into a token-minting role
- Google and Apple still require migration work to move onto the new upstream pattern cleanly

## Dependencies

- `authentication-api`
  - new provider handlers such as Telegram and WeChat
  - JWT issuance / upstream auth validation
- Kratos
  - standard OAuth providers and MFA where applicable
- Hydra
  - OIDC access-token issuance
- `auth-service`
  - `/mint` endpoint
  - existing token-signing boundary used by TOPRF
- TOPRF nodes
  - no change required

## Security Considerations

- keep `auth-service` as the trusted minting boundary to avoid JWKS and vault migration risk
- avoid live refresh-token migration by leaving existing token storage in `auth-service`
- ensure `/mint` validates upstream auth tokens before minting
- keep upstream auth tokens short-lived and scoped
- continue avoiding unnecessary PII storage in `authentication-api`

## Rollout Plan

### Phase 1

- implement Telegram in `authentication-api`
- implement and validate `/mint` in `auth-service`
- verify Telegram -> Hydra -> `/mint` -> TOPRF -> vault unlock end to end
- regression test existing Google and Apple flows

### Phase 2

- implement WeChat in `authentication-api`
- verify WeChat -> Hydra -> `/mint` end to end

### Phase 3

- migrate Google to the same upstream model
- migrate Apple to the same upstream model
- route legacy `auth-service` login entrypoints through the new architecture where needed

## Next Steps

- define the proxy pattern in detail, including exact payloads and redirect behavior
- document legacy-client and new-client sequence diagrams
- confirm product and legal position on any Kratos-related email / PII implications for standard OAuth providers
