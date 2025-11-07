# TASK: AB Testing for Perps

Setting MetaMask Mobile standard for AB testing via LaunchDarkly/Feature Flags.

## Implementation Notes

- Use feature flagging to toggle variants
- Instrument both button tap events and order submission events
- Ensure screenshots or tutorial images adapt to each variant — avoid color mismatch
- Ensure button colors are consistent across asset screen and trade screen

---

## TAT-1937: A/B test Long/Short button colors

**Goal:**
Determine which color scheme for Long and Short buttons drives:

1. Higher trade initiation rate (conversion from asset screen to Trading screen)
2. Higher trade execution rate (conversion from asset screen to executed trade)
3. Lowest misclick rate (Trading screen conversion rate + close position in <10s)
4. Fastest trade execution speed (duration from Asset screen to executed trade)

**Test Structure:**

- Phase 1: Multi-color vs. Monochrome
- Phase 2: Optimize the winning option with 2 variants

### Phase 1 Specs

**Design specs:** [Mobile Perps](https://www.figma.com/...)

| Variant                | Long Button | Short Button | Hypothesis                                          |
| ---------------------- | ----------- | ------------ | --------------------------------------------------- |
| A — Standard (Control) | Green       | Red          | Familiar & intuitive                                |
| B — Monochrome 1       | White       | White        | Reduces "risk anxiety," more balanced participation |

### Primary Metrics

| Category   | Metric                | Definition                                                                | Source   |
| ---------- | --------------------- | ------------------------------------------------------------------------- | -------- |
| Conversion | Trade initiation rate | % of users opening the trade screen after seeing the perp asset screen    | Mixpanel |
| Conversion | Trade execution rate  | % of users placing a trade after opening the trade screen                 | Mixpanel |
| Accuracy   | Misclick rate         | % of trades canceled or reversed within 10s                               | Mixpanel |
| Speed      | Transaction speed     | P1, P25 and P50 duration to tap on Long/short button in perp asset screen | Mixpanel |

---

## TAT-1940: A/B test Perps CTA in Asset details screen

**Description:**
Test different approaches to surface Perps functionality in the Asset Details screen for supported perp markets.

**Variants:**

- **A (Control)** = No changes
- **B** = Replace "Receive" button with "Perps" button (if the perp market is supported)
- **C** = Add banner below the price chart (if the perp market is supported)

**Acceptance Criteria:** (migrated)
None specified

---

## TAT-1827: A/B test Perps CTA in homepage

**Context:**
Changing the primary call-to-action (CTA) on the MetaMask Home Screen from "Receive" → "Perps" has the potential to massively influence user discovery and engagement — but it also carries risk of disrupting existing habits.

**Goal:**
Determine whether surfacing the Perps button on the wallet Home Screen increases:

1. Discovery & engagement with Perps
2. Active traders and trading volume without significantly hurting core wallet actions: Receive, Send, Swap usage, retention

### Test Variants

| Variant                                                      | Home Screen CTA                               | Hypothesis                                                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| A — Control                                                  | Current layout: [Buy] [Swap] [Send] [Receive] | Users focus on wallet basics; Perps remains secondary entry                                                                           |
| B — Replace "Receive" with "Perps"                           | [Buy] [Swap] [Send] [Perps]                   | Higher Perps entry rate; Slight drop in Receive usage covered by increase use of the second receive button                            |
| C — Replace "Receive" with "Perps" and put "Perps as 3rd CTA | [Buy] [Swap] [Perps] [Send]                   | Higher Perps entry rate; Slight drop in Receive usage covered by increase use of the second receive button; Slight drop in swap entry |

### Metrics to Track

#### Primary KPIs (Success)

| Category   | Metric            | Definition                   | Goal          |
| ---------- | ----------------- | ---------------------------- | ------------- |
| Engagement | Perps entry rate  | % of users tapping Perps CTA | +20% increase |
| Adoption   | New Perps traders | % of users placing ≥1 trade  | +10% increase |

#### Guardrail Metrics (No Harm)

| Category                | Metric                            | Threshold                          |
| ----------------------- | --------------------------------- | ---------------------------------- |
| Time-on-home-screen     | Avg. dwell time                   | no increase >10% (avoid confusion) |
| "Receive" feature usage | % of users tapping receive button | ≥ 90% baseline                     |
| "Swap" feature usage    | % of users tapping swap button    | ≥ 95% baseline                     |
