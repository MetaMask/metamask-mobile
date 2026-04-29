# Portfolio margin

Under portfolio margin, a user’s spot and perps trading are unified for greater capital efficiency. Furthermore, portfolio margin accounts automatically earn yield on all borrowable assets not actively used for trading.

Portfolio margin unlocks functionality such as the carry trade where a spot balance is offset by a short perps position, collateralized by the spot balance. Spot and perp pnl offset each other, protecting against liquidation on the perp position. More generally, spot and perps trading can be performed from a single unified balance. For example, a user could also hold HYPE and immediately buy BTC on the BTC/USDH book. All HIP-3 DEXs are included in portfolio margin, though not all HIP-3 DEX collateral assets are borrowable. Future HyperCore asset classes and primitives will support portfolio margin as well.

Users can supply eligible quote assets to earn yield. This synergizes and composes with HyperEVM lending protocols. In a future upgrade, CoreWriter will expose the same supply action for smart contracts. Portfolio margin intentionally does not bring a full-fledged lending market to HyperCore, as that is best built by independent teams on the EVM. For example, HyperCore lending is not tokenized, but an EVM protocol could do so by launching a fully onchain yield-bearing ERC20 token contract through CoreWriter and precompiles. Portfolio margin introduces organic demand to borrow and should expand the value proposition of teams building on the HyperEVM.

IMPORTANT: Portfolio margin is a complex technical upgrade and requires bootstrapping the supply side for borrowable assets. Portfolio margin accounts will fall back to non-portfolio margin behavior when caps are hit. During alpha mode, the following requirements apply:&#x20;

- Master account >$5M in weighted volume
- USDH: 500M USDH global supply cap, 100M USDH global borrow cap, 5M USDH user supply cap, 1M USDH user borrow cap
- USDC: 500M USDC global supply cap, 100M USDC global borrow cap, 5M USDC user supply cap, 1M USDC user borrow cap
- HYPE: 1M HYPE global supply cap, 50k HYPE user supply cap
- BTC: 400 BTC global supply cap, 20 BTC user supply cap

### LTV and borrowing

Under portfolio margin, eligible collateral assets have an LTV (loan-to-value) ratio between 0 and 1. During pre-alpha, HYPE will have an LTV of 0.5. When placing spot and perp orders under portfolio margin, insufficient balance will automatically borrowed against eligible collateral up to `token_balance * borrow_oracle_price * ltv` , where price is denominated in the asset being borrowed.

Borrowed assets accrue interest continuously, and are indexed hourly to match the perp funding interval. Portfolio margin users pay interest on borrowed assets and earn interest on idle assets according to the same rate. During pre-alpha, the borrow interest rate for stablecoins is set at `0.05 + 4.75 * max(0, utilization - 0.8)` APY, compounded continuously depending on the instantaneous value of `utilization = total_borrowed_value / total_supplied_value` . Earned interest is accrued proportionally to all suppliers. The protocol retains 10% of borrowed interest as a buffer for future liquidations.

### Example: Carry trade

The carry trade becomes significantly more capital efficient with portfolio margin, as there is no trading cost to rebalance over signifcant price ranges. A portfolio margin account's spot borrow and perps pnl offset each other for accounting. The trader still needs to account for external factors such as funding, interest, and drift between spot and perp prices.

For example, a user holds 1 BTC in spot and shorts 1 BTC-USDC perp at 10x leverage. If BTC's price is 100k, the user only pays interest on the 1/10 initial margin but earns funding on the full 100k position. If BTC's price moves down to 50k, the trader has unrealized pnl in USDC. The trader can choose to maintain the notional value of the trade by buying more spot BTC and increasing the perp short. If BTC's price moves up to 150k, portfolio margin automatically borrows 50k USDC against the spot BTC, now worth 150k. The user can sell BTC and close the perp position to maintain the notional exposure of the funding trade. If BTC's price moves up to 200k, the trader must reduce the notional exposure of the funding trade to avoid a borrow-lend liquidation.

Note that the hedged price range increased dramatically compared to the same trade without portfolio margin, where the perp leg is collateralized by USDC. &#x20;

### Liquidations

Portfolio margin is a generalization of cross margin. Instead of margining all perp positions within one DEX together, all cross margin perp positions and spot balances are collectively margined together within one account. Sub-accounts are still treated separately under portfolio margin.&#x20;

Liquidations are triggered when the entire portfolio margin account is below its portfolio maintenance margin requirement. Users can monitor this requirement via the _portfolio margin ratio,_ defined as

{% code overflow="wrap" %}

```latex
portfolio_margin_ratio = max_{borrowable_token} (portfolio_maintenance_requirement(borrowable_token) / portfolio_liquidation_value(borrowable_token))

where

portfolio_maintenance_requirement(token) = min_borrow_offset + sum_{dex} cross_maintenance_margin(dex) + borrowed_size_for_maintenance(token) * borrow_oracle_price(token)

portfolio_liquidation_value(token) = portfolio_balance(token) + min(borrow_cap(token), min(portfolio_balance(token), supply_cap(token)) * borrow_oracle_price(token) * liquidation_threshold(token))

liquidation_threshold(token) = 0.5 + 0.5 * LTV(token)

borrow_oracle_price(token) = median(HL_spot_USDC_price, HL_perp_mark_price * USDT_USDC_oracle, HL_perp_oracle_price * USDT_USDC_oracle)

USDT_USDC_oracle = 1 / HL_spot_oracle_price(USDC)

min_borrow_offset = 20 USDC
```

{% endcode %}

The account becomes liquidatable when portfolio_margin_ratio > 0.95. All notional values in the above definition are converted to USDC using `borrow_oracle_price(token)` .

During mainnet pre-alpha, the caps per user will begin at `borrow_cap(USDC) = 1000` and `supply_cap(HYPE) = 200`. After borrow caps are hit, additional margin used must be supplied by the user using the settlement asset regardless of whether portfolio margin is active. Therefore, the best way to test the full portfolio margin behavior is to use small test accounts.

Depending on the order of oracle price updates, either perp positions or spot borrows may be liquidated first. In other words, once portfolio margin ratio is liquidatable, users should not expect a deterministic liquidation sequence.
