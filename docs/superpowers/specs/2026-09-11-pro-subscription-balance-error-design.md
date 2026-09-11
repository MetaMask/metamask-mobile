# Pro Subscription Balance Error Design

## Goal

Show a specific, user-friendly error when subscription delegation preparation
fails because the Money account balance does not meet the subscription funding
requirement.

## Design

`useStartProSubscription` will compare caught errors against the exported
`SubscriptionDelegationServiceErrorMessage.InsufficientBalance` value. An exact
comparison is appropriate because the subscription controller currently throws
a plain `Error` with that enum value as its message.

For that error only, the hook will expose a new localized
`pro_subscription.insufficient_balance` message:

> You don't have enough funds in your Money account to start this subscription.

All other failures will continue to expose `pro_subscription.join_error`.
Logging, rethrowing, submission state, and delegation behavior will remain
unchanged.

## Testing

The hook unit test will verify that:

- the insufficient-balance service error exposes the new localized message;
- an unrelated delegation failure still exposes the generic join error; and
- delegation preparation is called with `checkBalance: true`.
