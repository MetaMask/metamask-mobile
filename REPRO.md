# REPRO: RPC calls not being made, and balances are not updating.

1. Setup the mobile repo: (`yarn setup:expo`, `yarn watch:clean`)
2. Open expo dev tools (hit the 'j' key in the `yarn watch`/watcher window) - view network tab and console.

   > NOTE: We've modified the app so we are "polling" balance updates every 5 seconds, so we should see many updates in the network tab!
   > However viewing the network tab shows no RPC calls made (except for startup and other flows, only the multicall is failing).

3. Send some funds on the same wallet in extension.
4. Expected: balances should update every 5 seconds. Actual: Balances never update as no RPC calls are made.

## Hypothesis: RPC calls are cached???

I'm really unsure of specific recent changes, but it looks like the multicall contract call is cached!

- This explains why the multicall call we make `await multicallContract.callStatic.tryAggregate(false, calldata)` returns almost immediately, and why no RPC calls are made.

But why is this happening now? I'm unsure of any recent update that this may have caused this.
