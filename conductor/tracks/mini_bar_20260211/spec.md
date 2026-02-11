# Specification: Floating Onboarding Mini-Bar Prototype

## Overview
This feature introduces a new UI variant for the onboarding checklist: a floating mini-bar that sits above the navigation bar. It provides a non-intrusive status indicator and serves as a portal to a dedicated full-screen "Onboarding Journey" page.

## Functional Requirements

### 1. The Floating Mini-Bar
- **Placement:** Positioned at the bottom of the screen, floating just above the main navigation bar.
- **Visuals:** Features a "cool" 3-part segmented line/bar that highlights each completed section (0%, 33%, 66%, 100%).
- **Scroll Behavior:** Smoothly slides down (hides) when the user scrolls down and slides up (appears) when the user scrolls up on the Homepage.
- **Action:** Tapping the bar navigates the user to the dedicated **Onboarding Journey Screen**.

### 2. The Onboarding Journey Screen
- **Type:** Full-screen dedicated page.
- **Content:** Displays the three onboarding steps:
  1. Secure Wallet (SRP)
  2. Add Funds
  3. Setup MetaMask Card
- **Actions:** Clicking a step navigates the user to the corresponding action (or simulated screen) as defined in previous iterations.

### 3. Demo Trigger & Reset Logic
- **Cycling:** The long-press trigger on "Popular Tokens" is updated to cycle through FOUR options:
  1. Style 1: Modern Fintech (Banner)
  2. Style 2: Integrated Minimalist (Banner)
  3. Style 3: Glassmorphism (Banner)
  4. **New: Floating Mini-Bar**
- **Persistence & Reset:** Once all steps are completed, the "Onboarding Complete - Tap to Reset (Demo)" placeholder appears at the top of the homepage. Clicking this will reset all steps and restore the active UI variant (including the Mini-Bar if selected).

### 4. Visibility Logic
- The Mini-Bar respects the same "Zero Balance" and "Not All Complete" visibility rules as the other checklist variants.

## Acceptance Criteria
- [ ] Mini-bar is correctly positioned above the nav bar.
- [ ] Segmented line highlights correctly based on completed steps.
- [ ] Bar hides on scroll-down and shows on scroll-up with smooth animation.
- [ ] Tapping the bar opens the full-screen Journey Screen.
- [ ] Journey Screen correctly triggers the Step 1, 2, and 3 actions.
- [ ] Demo Trigger cycles through all 4 UI options correctly.
- [ ] "Tap to Reset" restores the Mini-Bar state if it was the selected variant.
