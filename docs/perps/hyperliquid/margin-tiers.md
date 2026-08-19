# Margin tiers

Like most centralized exchanges, the tiered leverage formula on Hyperliquid is as follows:

`maintenance_margin = notional_position_value * maintenance_margin_rate - maintenance_deduction`&#x20;

On Hyperliquid, `maintenance_margin_rate` and `maintenance_deduction` depend only on the margin tiers, not the asset.

`maintenance_margin_rate(tier = n) = (Initial Margin Rate at Maximum leverage at tier n) / 2` . For example, at 20x max leverage, `maintenance_margin_rate = 2.5%`.

Maintenance deduction is defined at each tier to account for the different maintenance margin rates used at previous tiers:

`maintenance_deduction(tier = 0) = 0` &#x20;

`maintenance_deduction(tier = n) = maintenance_deduction(tier = n - 1) + notional_position_lower_bound(tier = n) * (maintenance_margin_rate(tier = n) - maintenance_margin_rate(tier = n - 1))` for `n > 0`&#x20;

In other words, maintenance deduction is defined so that new positions opened at each tier increase maintenance margin at `maintenance_margin_rate` , while having the total maintenance margin be a continuous function of position size.

Margin tables have unique IDs and the tiers can be found in the `meta` Info response. For IDs less than 50, there is a single tier with max leverage equal to the ID.

### Mainnet Margin Tiers

Mainnet margin tiers are enabled for the assets below:

#### BTC

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-150M                         | 40           |
| >150M                          | 20           |

#### ETH

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-100M                         | 25           |
| >100M                          | 15           |

#### SOL

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-70M                          | 20           |
| >70M                           | 10           |

#### XRP

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-40M                          | 20           |
| >40M                           | 10           |

#### DOGE, kPEPE, SUI, WLD, TRUMP, LTC, ENA, POPCAT, WIF, AAVE, kBONK, LINK, CRV, AVAX, ADA, UNI, NEAR, TIA, APT, BCH, HYPE, FARTCOIN

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-20M                          | 10           |
| >20M                           | 5            |

#### OP, ARB, LDO, TON, MKR, ONDO, JUP, INJ, kSHIB, SEI, TRX, BNB, DOT

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-3M                           | 10           |
| >3M                            | 5            |

### Testnet Margin Tiers

The tiers on testnet are lower than mainnet would feature, for ease of testing.&#x20;

#### LDO, ARB, MKR, ATOM, PAXG, TAO, ICP, AVAX, FARTCOIN - testnet only

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-10k                          | 10           |
| >10k                           | 5            |

#### DOGE, TIA, SUI, kSHIB, AAVE, TON - testnet only

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-20k                          | 10           |
| 20-100k                        | 5            |
| >100k                          | 3            |

#### ETH - testnet only

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-20k                          | 25           |
| 20-50k                         | 10           |
| 50-200k                        | 5            |
| >200k                          | 3            |

#### BTC - testnet only

| Notional Position Value (USDC) | Max Leverage |
| ------------------------------ | ------------ |
| 0-10k                          | 40           |
| 10-50k                         | 25           |
| 50-100k                        | 10           |
| 100k-300k                      | 5            |
| >300k                          | 3            |
