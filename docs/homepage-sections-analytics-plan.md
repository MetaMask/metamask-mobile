# Homepage Sections — Segment Events & Analytics Plan (Production)

What to track for the **Homepage Sections** experience in production: Segment/MetaMetrics events, properties, and analytics so you can measure engagement, conversions, and how well each section performs.

---

## 1. Goals

- **Engagement** — Which sections are seen and used (view all, item taps).
- **Conversion attribution** — Attribute valuable actions (buy, bridge, open Predict/Perps/DeFi/NFT details) to the homepage when the user came from it.
- **Source attribution** — Downstream screens (Token Details, NFT Details, Predict, DeFi, Bridge, Ramp) should know when the user came from a homepage section so you can report “conversions from homepage.”
- **Section performance** — Compare sections (tokens vs predictions vs DeFi vs NFTs vs perps) on reach, engagement, and conversion.

---

## 2. Event Taxonomy

| Category             | Purpose                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exposure / View**  | Homepage or section was shown (reach, which sections are visible).                                                                                                            |
| **Engagement**       | User interacted with a section (view all, section CTA, retry).                                                                                                                |
| **Item interaction** | User tapped a token, NFT, market, position, DeFi row, or CTA (Buy, Import).                                                                                                   |
| **Conversion**       | User completed a valuable action (buy, bridge, predict trade, etc.), tracked on the destination screen with `source` / `entry_point` so it can be attributed to the homepage. |

---

## 3. Segment Events to Implement

### 3.1 Exposure

| Event                        | When                                                              | Properties                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Wallet Opened** (existing) | User taps Wallet tab.                                             | Extend with `homepage_ui: 'sections' \| 'tabs'` so you know which UI they saw.                                                                                           |
| **Homepage Viewed** (new)    | Sections homepage is shown (user on Wallet tab with sections UI). | `sections_visible`: array of section ids rendered (e.g. `['tokens','perps','predictions','defi','nfts']` — omit sections that returned null). Optional: `section_count`. |

### 3.2 Section engagement

| Event                                              | When                                                     | Properties                                                            |
| -------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| **Homepage Section View All Clicked** (new)        | User taps section title / “View all”.                    | `section_id`: `'tokens'` \| `'nfts'` \| `'predictions'` \| `'perps'`. |
| **Homepage Section CTA Clicked** (new)             | User taps a primary CTA in a section (e.g. Import NFTs). | `section_id`, `cta` (e.g. `'import_nfts'`).                           |
| **Homepage Section Retry Clicked** (new, optional) | User taps Retry on a section error state.                | `section_id`.                                                         |

### 3.3 Per-section item interactions (use existing events + source/entry_point)

Existing events stay; add **source** or **entry_point** when the user came from a homepage section so conversions are attributable.

| Section         | User action                    | What to do                                                                                                                    |
| --------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Tokens**      | Tap token or popular token row | Token Details Opened (existing) with `source: 'homepage_tokens_section'`.                                                     |
| **Tokens**      | Tap Buy on popular token       | Ramp/Buy events with `source: 'homepage_tokens_section'` (or equivalent) so you can segment “buy from homepage.”              |
| **Predictions** | Tap position row               | Already has entry point for “homepage positions”; keep it on downstream Predict events.                                       |
| **Predictions** | Tap market card (carousel)     | Navigate to market details with `entry_point: 'homepage_featured_carousel'` (or similar) so Predict funnel can segment by it. |
| **Perps**       | View all                       | **Homepage Section View All Clicked** with `section_id: 'perps'`.                                                             |
| **DeFi**        | Tap protocol row               | DeFi Protocol Details Opened (existing) with `source: 'homepage_defi_section'`.                                               |
| **NFTs**        | Tap NFT                        | NFT Details Opened (existing) with `source: 'homepage_nfts_section'`.                                                         |
| **NFTs**        | View all / Import NFTs         | View all → **Homepage Section View All Clicked**; Import NFTs → **Homepage Section CTA Clicked** with `cta: 'import_nfts'`.   |

---

## 4. New Event Names (Schema)

Add these to your analytics schema (e.g. MetaMetrics / Segment):

- **Homepage Viewed** — sections homepage shown.
- **Homepage Section View All Clicked** — view all / section title tap.
- **Homepage Section CTA Clicked** — section-level CTAs (e.g. Import NFTs).
- **Homepage Section Retry Clicked** (optional) — retry on section error.

Existing events (Wallet Opened, Token Details Opened, NFT Details Opened, DeFi Protocol Details Opened, Predict/Bridge/Ramp) are **extended with properties** (`homepage_ui`, `source`, `entry_point`) — no new event names for those.

---

## 5. Downstream conversion attribution

When the user goes **Homepage → section tap → Token Details / NFT Details / Predict / DeFi / Bridge / Ramp**, the **destination** screen should know they came from the homepage.

- **How**: Pass `source` or `entry_point` in navigation (e.g. route params). Each destination that already tracks events adds that property so you can filter “opened from homepage” and build conversion funnels.
- **Scope**: Any screen reachable from a homepage section tap should accept and send that context so “conversions from homepage” is measurable.

---

## 6. Analytics to Track — Funnels & Metrics

### Funnels

1. **Exposure**  
   Wallet Opened (filter `homepage_ui: 'sections'`) → Homepage Viewed.  
   Use to measure: how many users see the sections homepage.

2. **Section engagement**  
   Homepage Viewed → Homepage Section View All Clicked (by `section_id`).  
   Use to measure: which sections drive the most “view all” traffic.

3. **Conversions from homepage**  
   Filter any conversion event (Token Details Opened, NFT Details Opened, DeFi Protocol Details Opened, Predict market/order, Bridge viewed/completed, Ramp buy) where `source` or `entry_point` indicates a homepage section.  
   Use to measure: homepage-driven depth (details opened) and revenue (buy, bridge, predict).

4. **Section → conversion**  
   Homepage Section View All Clicked (by `section_id`) → next screen viewed / conversion event.  
   Use to measure: which section’s “view all” leads to the most downstream actions.

### Key metrics

- **Reach**: Unique users with Homepage Viewed (or Wallet Opened + `homepage_ui: 'sections'`) in period.
- **Section engagement rate**: (Users who fired at least one Homepage Section View All Clicked or section item tap) / (Users who fired Homepage Viewed).
- **Engagement by section**: Count of View All + item taps per `section_id`.
- **Conversion from homepage**: Count (or revenue) of conversion events where `source` / `entry_point` = homepage section.
- **Conversion rate from homepage**: (Conversions from homepage) / (Homepage Viewed or section engagement).
- **Section error rate** (if you track retry): Homepage Section Retry Clicked by `section_id` vs section loads.

### Dashboards (Segment / Mixpanel / etc.)

- **Homepage overview**: Reach, Homepage Viewed, sections_visible distribution, section engagement by section_id.
- **Section performance**: Per section — impressions (in sections_visible), View All clicks, item taps, downstream conversions; optional: conversion rate from that section.
- **Conversion funnel**: Homepage Viewed → Section engagement → Token/NFT/DeFi/Predict/Bridge/Ramp events with homepage source; optional: revenue by source.
- **Errors**: Homepage Section Retry Clicked by section_id (if implemented).

---

## 7. High-level implementation workstreams

1. **Exposure** — Extend Wallet Opened with `homepage_ui`; add Homepage Viewed on sections mount with `sections_visible`.
2. **Section engagement** — Implement and fire Homepage Section View All Clicked, Homepage Section CTA Clicked, (optional) Homepage Section Retry Clicked with `section_id` / `cta`.
3. **Source / entry_point** — For each section (Tokens, Predictions, Perps, DeFi, NFTs), ensure navigations and existing events carry a consistent `source` or `entry_point` when the user came from that section.
4. **Analytics setup** — Register new event names; document properties; build dashboards and funnels above.

---

## 8. Summary

**Segment events:** Homepage Viewed, Homepage Section View All Clicked, Homepage Section CTA Clicked, (optional) Homepage Section Retry Clicked. Extend Wallet Opened with `homepage_ui` and extend existing conversion events with `source` / `entry_point` when the user came from a homepage section.

**Analytics:** Track exposure (who sees the sections homepage), section engagement (view all + item taps by section), and conversions from homepage (details opened, buy, bridge, predict) so you can measure reach, engagement rate, conversion rate, and section-level performance in production.
