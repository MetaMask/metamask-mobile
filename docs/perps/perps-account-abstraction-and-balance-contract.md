# Perps account abstraction and balance contract

Historical agentic validation for this contract used Mobile-local recipe files.
Recipe authoring has moved out of the Mobile repository to the external Recipe
v1 runner. Keep this document focused on the product contract; executable
recipes and evidence artifacts should live with the external runner.

## Contract summary

Perps account balance display must preserve the distinction between spendable
balance, collateral, and HyperLiquid account abstraction state. Validation should
exercise clean accounts, accounts with positions/orders, and Unified/Standard
mode transitions through the runner-owned recipe suite.
