# VBA screen performance Sentry contract

Every customer-facing Virtual Bank Account screen emits an independent
transaction named `VBA Screen Load` with operation `vba.operation`.
Transactions use one shared name and are separated by the bounded `screen_id`
attribute.

## Attributes

- `feature`: always `vba`
- `screen_id`: a value from `VBA_SCREEN_ID`
- `content_state`: `populated`, `empty`, or `error`
- `success`: `true` when meaningful content is ready
- `reason`: `unmounted`, `app_backgrounded`, or `disabled` when content was
  not reached

No wallet addresses, profile IDs, bank details, fiat amounts, provider response
bodies, or raw errors are attached.

## Screens

- `onboarding_loading`
- `vendor_terms`
- `email_verification`
- `identity_verification_terms`
- `identity_verification_provider`
- `kyc_pending`
- `identity_verified`
- `choose_currency`
- `kyc_rejected`
- `account_provisioning_error`
- `account_create_details_error`
- `account_create_generic_error`
- `onboarding_error`
- `account_creation`
- `account_details`
- `provider_terms_modal`

The Money entry sheet, global support consent, native MFA and SumSub surfaces,
post-onboarding transaction details, and debug-only deposit sheet are not
VBA-owned screens and are not included.

## Verify locally

Run Metro with development logging and a valid Sentry DSN:

```bash
SDK_DEV=DEV MM_SENTRY_DSN=<dsn> yarn watch:clean
```

Accept metrics consent, enter the VBA flow, and verify Metro logs before
checking Sentry:

```text
[VbaCUF] VBA Screen Load started {"feature":"vba",...}
[VbaCUF] VBA Screen Load completed {"success":true,...}
```

Use Trace Explorer in the `development` environment:

```text
span.op:vba.operation span.name:"VBA Screen Load"
```

For latency, add `success:true`, group by `screen_id`, and split by platform and
release. Query `success:false` separately for abandonment and group by `reason`;
do not include those spans in latency percentiles.
