# HIP-2: Hyperliquidity

### Motivation&#x20;

Though HIP-1 is sufficient as a permissionless token standard, in practice it is often crucial to bootstrap liquidity. One of Hyperliquid's core design principles is that liquidity should be democratized. For perps trading, HLP can quote deep and tight liquidity based on CEX perp and spot prices, but a new model is needed for HIP-1 tokens that are in early phases of price discovery.

Hyperliquidity is inspired by Uniswap, while interoperating with a native onchain order book to support sophisticated order book liquidity from end users. HIP-2 is a fully decentralized onchain strategy that is part of Hyperliquid's block transition logic. Unlike conventional automated order book strategies, there are no operators. The strategy logic is secured by the same consensus that operates the order book itself. Note that Hyperliquidity is currently only available on spot pairs against USDC.&#x20;

Hyperliquidity is parametrized by

1. `spot`: a spot order book asset with USDC quote returned by a deployment of HIP-1
2. `startPx`: the initial price of the range
3. `nOrders`: the number of orders in the range
4. `orderSz`: the size of a full order in the range
5. `nSeededLevels`: the number of levels that begin as bids instead of asks. Note that for each additional bid level added by incrementing `nSeededLevels` the deployer needs to fund Hyperliquidity with `px * sz` worth of USDC. For fixed `nOrders`, increasing seeded levels decreases the total supply because it reduces the genesis supply of Hyperliquidity.

Each Hyperliquidity strategy has a price range defined recursively `px_0 = startPx`, `px_i = round(px_{i-1} * 1.003)`. The strategy updates on every block where the block time is at least 3 seconds since the previous update block. After each update:

1. Strategy targets `nFull = floor(balance / orderSz)` full ask orders and a `balance % orderSz` partial ask order if the partial order is nonzero. To the extent that ALO orders are not rejected, these orders are ensured.
2. Each fully filled tranche is modified to an order of side `orderSz` on the side with available balance, with the exception of the single partial order from (1) if it exists.

The resulting strategy guarantees a 0.3% spread every 3 seconds. Like smart-contract based pools on general purpose chains, Hyperliquidity requires no maintenance in the form of user transactions. One key improvement is that Hyperliquidity participates in a general purpose order book. Active liquidity providers can join in liquidity provision alongside Hyperliquidity at any time, allowing markets to adapt to increasing demand for liquidity.
