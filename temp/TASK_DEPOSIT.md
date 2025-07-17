We need to replace the current deposit view /Users/deeeed/dev/metamask/metamask-mobile-1202/app/components/UI/Perps/Views/PerpsDepositAmountView.tsx to replace current Deposit View to be similar to the BridgeView as per the design funding_modal.png .
- By default it should pre select usdc on arbitrum in the "from" and should set usdc hyperliquid in the destination as per the screenshot.
We can probably re-use most of the layout from the bridge screen and adapt to the design.

Once the users set the initial amount in the from token duration, it should then fetch a quote and display the fees into the interface.
We should be able to configure the slippage as it is done in the bridge screen.

The token selector should be similar to the bridge screen.