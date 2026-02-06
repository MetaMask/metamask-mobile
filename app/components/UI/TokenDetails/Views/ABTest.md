# Token Details A/B Test Options

This document outlines two feasible A/B testing approaches for the Token Details page layout, comparing the new design (with sticky Buy/Sell footer) against the old design (with Swap button).

## Background

We have a feature flag (`tokenDetailsV2Buttons`) that controls:
- **When ON (New Layout)**: Cash Buy, Send, Receive, More buttons + sticky Buy/Sell footer
- **When OFF (Old Layout)**: Buy, Swap, Send, Receive buttons + NO sticky footer

---

## Button Behavior Reference

### Sticky Footer Buttons (New Layout)

| Button | Behavior |
|--------|----------|
| **Buy** | Smart swap: finds user's best token → swaps TO current token. Falls back to on-ramp if no eligible tokens. |
| **Sell** | Swap FROM current token → default destination |

### Old Action Buttons

| Button | Behavior |
|--------|----------|
| **Buy** | Opens Fund Action Menu (on-ramp/deposit options) |
| **Swap** | Opens swap with current token as source (same as Sell) |
| **Send** | Standard send flow |
| **Receive** | Standard receive/QR flow |

**Key Insight**: The old Swap button and new Sell button have nearly identical behavior (both swap FROM current token).

---

## Option A: Complete Layout Comparison

### Description
Compare two distinct, complete experiences.

| Variant | Action Buttons | Sticky Footer |
|---------|---------------|---------------|
| **Control** | Buy, Swap, Send, Receive | None |
| **Treatment** | Cash Buy, Send, Receive, More | Buy, Sell |

### Visual Comparison

**Control (Old Layout)**
```
┌─────────────────────────────────────┐
│           Token Details             │
│              Chart                  │
├─────────────────────────────────────┤
│  [Buy] [Swap] [Send] [Receive]      │  ← Action buttons with Swap
├─────────────────────────────────────┤
│           Transactions              │
└─────────────────────────────────────┘
                                         ← No sticky footer
```

**Treatment (New Layout)**
```
┌─────────────────────────────────────┐
│           Token Details             │
│              Chart                  │
├─────────────────────────────────────┤
│ [Cash Buy] [Send] [Receive] [More]  │  ← New action buttons (no Swap)
├─────────────────────────────────────┤
│           Transactions              │
├─────────────────────────────────────┤
│         [Buy]    [Sell]             │  ← Sticky footer
└─────────────────────────────────────┘
```

### Implementation Complexity
**LOW** - The code already cleanly separates these two states.

```typescript
// Current code structure in AssetOverviewContent.tsx
{isTokenDetailsV2ButtonsEnabled ? (
  <TokenDetailsActions ... />  // New buttons
) : (
  <AssetDetailsActions ... />  // Old buttons with Swap
)}

// In TokenDetails.tsx - sticky footer tied to same flag
{isTokenDetailsV2ButtonsEnabled && (
  <BottomSheetFooter ... />  // Sticky Buy/Sell
)}
```

**Changes Required:**
1. Convert `selectTokenDetailsV2ButtonsEnabled` to return A/B variant name instead of boolean
2. Add analytics tracking with `ab_tests: { token_details_layout: variantName }`
3. Create LaunchDarkly flag with variant configuration

### Test Hypothesis
> "Does the complete new layout (sticky Buy/Sell footer + simplified action buttons) drive better engagement than the old layout (Swap button, no sticky footer)?"

### Pros
- Clean comparison of two complete, coherent experiences
- Minimal code changes (just convert boolean to variant)
- Clear analytics separation
- No UX confusion from mixed elements

### Cons
- Tests multiple changes at once (can't isolate Swap button impact specifically)

---

## Option B: Isolated Swap Button Test

### Description
Keep sticky Buy/Sell footer constant, test only the button layout.

| Variant | Action Buttons | Sticky Footer |
|---------|---------------|---------------|
| **Control** | Buy, Swap, Send, Receive | Buy, Sell |
| **Treatment** | Cash Buy, Send, Receive, More | Buy, Sell |

### Visual Comparison

**Control (Old Buttons + Sticky Footer)**
```
┌─────────────────────────────────────┐
│           Token Details             │
│              Chart                  │
├─────────────────────────────────────┤
│  [Buy] [Swap] [Send] [Receive]      │  ← Old buttons WITH Swap
├─────────────────────────────────────┤
│           Transactions              │
├─────────────────────────────────────┤
│         [Buy]    [Sell]             │  ← Sticky footer (same in both)
└─────────────────────────────────────┘
```

**Treatment (New Buttons + Sticky Footer)**
```
┌─────────────────────────────────────┐
│           Token Details             │
│              Chart                  │
├─────────────────────────────────────┤
│ [Cash Buy] [Send] [Receive] [More]  │  ← New buttons (no Swap)
├─────────────────────────────────────┤
│           Transactions              │
├─────────────────────────────────────┤
│         [Buy]    [Sell]             │  ← Sticky footer (same in both)
└─────────────────────────────────────┘
```

### Implementation Complexity
**MODERATE** - Requires decoupling sticky footer from button layout.

```typescript
// Current: Sticky footer tied to isTokenDetailsV2ButtonsEnabled
{isTokenDetailsV2ButtonsEnabled && (
  <BottomSheetFooter ... />
)}

// Required change: Always show sticky footer
{displaySwapsButton && (
  <BottomSheetFooter ... />
)}

// A/B test only the buttons
{isControlVariant ? (
  <AssetDetailsActions ... />  // Old with Swap
) : (
  <TokenDetailsActions ... />  // New without Swap
)}
```

**Changes Required:**
1. Decouple sticky footer from button layout flag
2. Create new A/B test selector for button layout
3. Ensure sticky footer works correctly with old button layout
4. Add analytics tracking

### Test Hypothesis
> "With sticky Buy/Sell footer present, does having the Swap button visible increase swap engagement?"

### Overlap Consideration

In Control variant, users would have:

| Action | Available Via |
|--------|--------------|
| Swap TO this token | Sticky Buy button |
| Swap FROM this token | **Both** Swap button AND Sticky Sell button |
| On-ramp | Old Buy button (Fund menu) OR Sticky Buy fallback |
| Send/Receive | Action buttons |

**Swap + Sell Redundancy**: Both buttons trigger swap FROM current token. This could:
- Increase swap usage (more visible options)
- Confuse users (why two buttons for same action?)
- Split analytics (actions distributed between two buttons)

### Pros
- Isolates the specific impact of the Swap button
- Answers: "Is Swap button valuable even when Buy/Sell sticky footer exists?"

### Cons
- More code changes required (decouple footer)
- Swap + Sell redundancy may confuse users
- Analytics complexity (need to track both buttons)
- Tests a hybrid that wasn't part of original design

---

## Comparison Summary

| Aspect | Option A | Option B |
|--------|----------|----------|
| **Feasibility** | HIGH | HIGH |
| **Code Changes** | Minimal | Moderate |
| **Test Clarity** | Clean separation | Swap + Sell overlap |
| **Hypothesis** | "New layout vs old layout" | "Is Swap button valuable with sticky footer?" |
| **UX Coherence** | Two distinct experiences | Hybrid with redundancy |
| **Analytics** | Clean | Needs overlap handling |
| **Implementation Time** | Faster | Slower |

---

## Recommendation

**Option A is recommended** because:

1. **Cleaner A/B test** - Two distinct, complete experiences
2. **Simpler implementation** - Code already supports this separation
3. **Clear hypothesis** - "Does new layout improve engagement?"
4. **No UX confusion** - Each variant is a coherent, self-consistent design
5. **Faster to implement** - Just convert boolean to variant

**Option B is viable** if the specific question is: "Should we keep the Swap button even with the new sticky footer?" However, the Swap + Sell redundancy makes this test harder to interpret cleanly.

---

## Implementation Checklist (for chosen option)

### LaunchDarkly Setup
- [ ] Create flag: `tokenDetailsButtonsAbTest` (String type)
- [ ] Define variations: `control`, `treatment`
- [ ] Configure percentage rollout (e.g., 50/50)
- [ ] Enable "SDKs using Mobile Key"

### Code Changes
- [ ] Create A/B test selector (following Perps pattern in `app/components/UI/Perps/selectors/featureFlags/`)
- [ ] Update `AssetOverviewContent.tsx` to use variant-based rendering
- [ ] Update `TokenDetails.tsx` for sticky footer logic (if Option B)
- [ ] Add `TOKEN_DETAILS_PAGE_VIEWED` event with `ab_tests` property

### Analytics
- [ ] Add `ab_tests` property to Segment schema (one-time PR to `Consensys/segment-schema`)
- [ ] Track page views with variant: `ab_tests: { token_details_layout: variantName }`
- [ ] Track button clicks with variant context
- [ ] Create Mixpanel dashboard for analysis

### Testing
- [ ] Verify both variants render correctly
- [ ] Verify analytics events fire with correct variant
- [ ] Test fallback behavior when flag is disabled

---

## References

- [A/B Testing Framework](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/400743989262/A+B+Testing+Framework)
- [Perps A/B Testing Guide](../../Perps/docs/perps-ab-testing.md)
- [Current proposal document](../../../../selectors/featureFlagController/tokenDetailsV2/proposal.md)
