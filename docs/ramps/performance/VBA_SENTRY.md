# VBA screen performance Sentry contract

The 16 bounded `VBA_SCREEN_ID` and `KYC_SCREEN_ID` screens emit independent
forced transactions:

- VBA: `VBA Screen Load` / `vba.operation`; KYC: `KYC Screen Load` /
  `kyc.operation`.
- Tags: `flow:vba`, `metric_type:screen_load`, `feature`, `screen_id`,
  `content_state`, and `success`.
- Unfinished reasons: `unmounted`, `app_backgrounded`, or `disabled`.

Wallet/profile IDs, bank details, amounts, provider bodies, and raw errors are
excluded, as are shared Money, support, native SDK, transaction, and debug UI.

## Verify locally

Run `SDK_DEV=DEV MM_SENTRY_DSN=<dsn> yarn watch:clean`, accept metrics consent,
exercise the flow, verify `[VbaCUF]` and `[KycCUF]` logs, then query Sentry
`development` with `flow:vba metric_type:screen_load`. Group successful spans
by `feature` and `screen_id`, and failures by `reason`.
