# Specification: Final Onboarding Layout Variations

## Overview
This track refines the "Sleek Timeline" (Style 2) into three layout variations for the empty balance state. These variations test different structural hierarchies for the onboarding checklist.

## Functional Requirements

### 1. Layout Variations

#### Variation 1: Integrated Header (Layout A)
- **Position:** Replaces the existing "Add Funds" banner (bank iconography).
- **Structure:**
  - "Sleek Timeline" (Style 2) is rendered at the top of the Homepage content area.
  - Standard action buttons (Buy, Send, etc.) are maintained directly underneath the checklist.
- **Visuals:** Uses the clean, borderless Style 2 aesthetic.

#### Variation 2: Minimalist Hero (Layout B)
- **Position:** Top of the Homepage content area.
- **Structure:**
  - "Sleek Timeline" (Style 2) is the *only* primary element visible.
  - The "Add Funds" banner AND the standard action buttons are removed entirely.
- **Visuals:** Maximizes focus on the setup journey.

#### Variation 3: Checklist Below Actions (Layout C)
- **Position:** Standard original position.
- **Structure:**
  - "Add Funds" banner remains at the top.
  - Standard action buttons remain in the middle.
  - "Sleek Timeline" (Style 2) is rendered *below* the action buttons.
- **Visuals:** Follows the original structural hierarchy.

### 2. Demo Integration
- The long-press trigger on "Popular Tokens" cycles through: **Layout A -> Layout B -> Layout C**.
- Completion logic and shared state remain identical.

### 3. Visibility Logic
- Variations apply only when the balance is $0.

## Acceptance Criteria
- [ ] Layout A replaces the banner and keeps actions.
- [ ] Layout B removes both the banner and actions.
- [ ] Layout C keeps both the banner and actions, placing the checklist below them.
- [ ] Demo cycle correctly toggles between A, B, and C.
