# Money Sweepstakes: Prototype changes from the original PR

## Scope

This document records the product and UX changes made in this working tree on top of the PR #33887 checkout. It is a prototype change log, not a replacement for the campaign PRD or official rules.

## 1. Campaign entry point in Rewards

- Replaced the small upcoming/reminder treatment with the standard full-image campaign card used elsewhere in Rewards.
- Renamed the user-facing campaign to **Money Sweepstakes**.
- Added campaign-specific artwork, a subtle card outline, and a text-safe layout so the title remains readable.
- Removed **Notify me** and the notification flow. The campaign is now presented as live and uses opt-in instead.
- Tapping the campaign now opens the campaign page directly; the previous three-step onboarding carousel is skipped.

## 2. Campaign page before opt-in

- Reworked the hero into a shorter, campaign-specific banner with the prize message outside the artwork.
- Simplified the explanation into a **How to enter** section:
  1. Fund your Money account.
  2. Earn daily entries while the qualifying balance is held.
  3. Win weekly prizes.
- Removed decorative number treatments and unnecessary containers; steps use the MetaMask icon and divider pattern.
- Changed the primary action from **Opt in** to **Join the sweepstakes**.
- The consent sheet keeps **Opt in**, where the legal meaning is appropriate.
- The consent disclosure is visually secondary, left-aligned legal text. **Official Rules** opens the Rules and eligibility screen.
- Regional restrictions are checked when the user attempts to join, rather than being presented as a balance-card status.

## 3. Post-opt-in campaign page

- Replaced the generic campaign image and multi-metric diagnostic grid with a compact Money Account balance summary.
- The summary groups the balance, weekly entry count, eligibility guidance, and **Add funds** into one actionable financial card.
- Added clear, backend-driven status copy:
  - **Qualified** / “On track for today’s entry” when the user is earning entries.
  - “Add $X to start earning entries” before the qualifying threshold is met.
  - “Add $X to resume earning tomorrow” after a balance drop that forfeits today’s entry.
- Removed the visible **Ineligible** label. It is too final and can be confused with regional/legal exclusion.
- Removed the campaign header image after opt-in so the user sees their current financial state and the next action first.
- Moved **Add funds** into the balance card instead of leaving it as a disconnected sticky action.

## 4. Draw schedule

- Rebuilt the schedule into a chronological four-week financial summary.
- Each week shows its date range, week label, current state, and prize information.
- Current week is highlighted as **Current draw** and shows the user's current entry count.
- Completed weeks show the awarded amount; future weeks show the prize pool.
- Added a short footer clarifying that entries reset after each weekly draw.
- The prototype fills missing backend weeks and anchors the current state for demo purposes; live data should eventually supply all four campaign weeks and their real statuses.

## 5. Rules and progressive disclosure

- Removed the question-mark entry point and the generic “Mechanics” terminology.
- The detailed campaign rules are now presented as **Rules and eligibility** in the dedicated mechanics screen.
- Replaced the long wall of rules copy with MetaMask-style expandable rule rows.
- Removed redundant Rules/eligibility calls to action from the campaign overview where the consent sheet and mechanics screen already provide that path.

## 6. Bottom learning links after opt-in

- Replaced the large illustrated cards with compact navigation rows.
- **How it works** opens the campaign mechanics/rules experience.
- **MetaMask USD** opens the Money Account home rather than the unrelated mUSD calculator.
- Removed **What you get** because it duplicated campaign information and did not have a distinct destination.

## 7. Design-system and accessibility work

- Used semantic dark-mode surfaces, text, borders, icons, and success/warning colors.
- Added card/row accessibility labels and standard navigation affordances.
- Used top-aligned 32 px circular icon treatments for the learning rows, matching nearby Rewards patterns.
- Added or updated focused tests around campaign tiles, reminders, opt-in behavior, draw schedule states, stats states, rich-text links, and campaign series handling.

## Remaining dependencies and follow-up

- **Qualifying threshold:** The PRD specifies a $100 qualifying deposit and balance. The current development Rewards API returns a $3 threshold; the app intentionally renders the backend value, so the dev backend must be updated to return `qualifyingThresholdUsd: 100`.
- **Eligibility authority:** The backend must remain the source of truth for opt-in, geography, qualifying deposits, balance status, and daily-entry eligibility. The UI must not infer qualification from balance alone.
- **Live schedule data:** Replace prototype week expansion/current-week anchoring with complete backend schedule and draw-result data before release.
- **Post-campaign experience:** Continue validating the winner/non-winner outcome states and the existing draw proof/results presentation against final legal requirements.

## Primary implementation files

- `app/components/UI/Rewards/Views/MoneyAccountSweepstakesCampaignDetailsView.tsx`
- `app/components/UI/Rewards/components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesCampaignOverview.tsx`
- `app/components/UI/Rewards/components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesCampaignCTA.tsx`
- `app/components/UI/Rewards/components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesDrawScheduleSection.tsx`
- `app/components/UI/Rewards/components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesLearnMoreRows.tsx`
- `app/components/UI/Rewards/components/Campaigns/CampaignTile.tsx`
- `app/components/UI/Rewards/components/Campaigns/CampaignOptInSheet.tsx`
- `app/components/UI/Rewards/Views/CampaignMechanicsView.tsx`
