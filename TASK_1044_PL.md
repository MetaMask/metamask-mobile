The goal of this PR is to implement:

- TAT-1044 "Users can view total unrealized PnL across multiple open positions"
- TAT-1299 "Perp account balance is accounted for in the total wallet balance"

The problem is that currently in app/components/Views/Wallet/index.tsx we have:

```
          <PerpsConnectionProvider>
            <PerpsStreamProvider>
              <PortfolioBalance />
            </PerpsStreamProvider>
          </PerpsConnectionProvider>
```

Which wraps the perpsconnectionprovider and thus establishes live connection to the websocket and maintain it but the point of perps is that the websocket should disconnect while we are not displaying the perps environment!
So we need to figure out a way to store all the values for the PortfolioBalance that are perps related in and also per Perps Provider since we may have balances from multiple providers. So I think our storage with extendedAccountState may not be correct.

Additionally we have made changes to the app/components/UI/Perps/components/PerpsTabControlBar/PerpsTabControlBar.tsx so it include the unrealized P&L. This one is within the perps environment to be loaded so it can auto refresh when we have positions updating so I think when a positions change is detected we should update something in the state probably from within the PerpsController so that the PorffolioBalance can get updated and get the total balance for all perps protocol (without being a child of PerpsConnectionProvider or PerpsStreamProvider).

Based on this can you provide a recommendation on how we should adjust?
One of my idea is that when app loads when we havent yet loaded the peprs position we should have a separate hook that would call the PerpsController and manually compute the balances and set them in the state.
Then when we are in the actual Perps Environment (within the PerpsConnectionProvider and PerpsStreamProvider) then within the PerpsController we have subscription to positions that as soon as positions change we would update that value. The problem is that prices are constantly changing so we dont want to update this value every second, I think we can have something like 30sec update throttling.

Can you review how we could "fix" this PR in the best way ?
