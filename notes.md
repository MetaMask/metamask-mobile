# TODOS: UNKNOWN TYPES

## transaction-reducer-helpers.ts

- `txMeta` parameter in `getTxData` and `getTxMeta` functions: The exact structure of `txMeta` is unknown. It is currently typed as `Record<string, unknown>`, but further investigation is needed to determine the specific types for each property.
- Properties within `txMeta`: The properties `data`, `from`, `gas`, `gasPrice`, `to`, `value`, `maxFeePerGas`, `maxPriorityFeePerGas`, and `securityAlertResponse` are currently typed as `unknown`. Further investigation is needed to determine their specific types.
