# Braze Money Vault APY Connected Content Design

## Goal

Render the current production Money Account vault APY in the Braze splash
template using Braze Connected Content. Match the app's display conversion:
multiply decimal APY by 100, round to one decimal place using half-up behavior,
and omit a trailing `.0`.

## Data source

Fetch:

`https://money.api.cx.metamask.io/v1/vaults`

Select the entry in `vaults` whose `vault_address`, compared
case-insensitively, equals:

`0x1c8a336051d2024e318a229d01f9f6cf96efd316`

Keep the target address in one Liquid variable near the top of the template so
it can be updated independently.

## Liquid data flow

1. Initialize the display APY to the approved `6%` fallback.
2. Request the vault response with Braze Connected Content and `:no_cache`.
3. On a successful response, iterate over `vaults`.
4. Compare each normalized vault address with the configured target address.
5. For the first matching vault with a non-blank `current_apy`:
   - Coerce the decimal string to a number.
   - Multiply by 100.
   - Round to one decimal place.
   - Remove a trailing `.0`.
   - Store the result, including `%`, in `money_account_apy_display`.
6. Stop iterating after a valid match.
7. Retain `6%` when the request fails, the response is malformed, no matching
   vault exists, or `current_apy` is blank.

For example, `"0.0628"` renders as `6.3%`.

## Template integration

The Connected Content block and APY variables must be evaluated before the
`MetaMask_Earn_Experiment` Content Block is included.

Both APY-bearing locations use `money_account_apy_display`:

- Subtitle
- Money Account panel value (`Body_text_4`)

The dashboard Content Block must interpolate the variable in each localized
string. The repository template cannot update dashboard-managed Content Block
content. English defaults in the HTML will also use the dynamic variable.

## Failure behavior

Per product decision, failure retains the existing visible fallback copy:

`Up to 6% APY`

The template does not abort the splash when Connected Content is unavailable.
This preserves campaign display but means the fallback can differ from the
current API value during a service failure.

## Scope

- Edit `money-deposit-braze-splash.html`.
- Do not change `useMoneyVaultApy.ts`.
- Do not change eligibility, event emission, deeplink, or Braze SDK behavior.
- Document the required dashboard Content Block interpolation in the handoff.

## Validation

- Confirm Liquid has one configurable vault-address assignment.
- Confirm `"0.0628"` produces `6.3%`.
- Confirm `"0.0600"` produces `6%`.
- Confirm request, response, missing-vault, and blank-APY failures preserve
  `6%`.
- Confirm both English default APY locations consume the dynamic value.
- Confirm formatting introduces no HTML or Liquid syntax errors.
