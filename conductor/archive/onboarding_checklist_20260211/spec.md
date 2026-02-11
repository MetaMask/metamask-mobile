# Specification: Onboarding Checklist Prototype (Dynamic Demo Mode)

## Overview

A high-fidelity prototype of an onboarding checklist with built-in "experiment toggles." This allows stakeholders to instantly switch between different UI placements and Step 3 variations during a demo.

## Prototype Features & Shortcuts

### 1. Dynamic UI Placements (The "Switch")

To test different UI components, we will implement two primary modes:

- **Mode A (Banner):** Persistent `MMDS.Box` at the top of the Homepage sections.
- **Mode B (Floating Bottom):** A "sticky" component at the bottom that appears when scrolling up and hides when scrolling down (using basic `Animated` or `ScrollView` offset logic).

### 2. Step 3 Experimental Options

A local state toggle will allow the user to switch between how Step 3 options are presented:

- **Variation 1:** Single Featured CTA (e.g., just "Swap").
- **Variation 2:** Expanding Dropdown with all three options (Card, Swap, Predict).

### 3. Demo Controller

- **Shortcut:** A small, temporary "Demo Mode" button (or a long-press on the checklist) that opens a simple ActionSheet to toggle:
  - Placement: Banner vs. Floating.
  - Step 3: Single vs. Multi.
  - Reset: Clear all completion states.

## Acceptance Criteria (Demo Focus)

- [ ] Stakeholder can toggle between Banner and Floating Bottom UI.
- [ ] Floating Bottom UI responds to scroll direction (hides on down, shows on up).
- [ ] Step 3 content can be swapped between a single CTA and a list.
- [ ] All CTAs navigate to valid (existing) app flows.
