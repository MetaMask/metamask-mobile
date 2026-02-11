# Implementation Plan: Swipe Deck Onboarding Journey Variant

## Phase 1: View Architecture & Toggling
- [x] Task: Update OnboardingJourneyScreen Structure d460ca7
    - [ ] Implement a `journeyView` state (LIST vs DECK).
    - [ ] Build the Segmented Control component using MMDS.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Swipe Deck Component Development
- [ ] Task: Build the `OnboardingDeck` component
    - [ ] Implement the visual card stack effect (background layers).
    - [ ] Create the data mapping for the 3 onboarding steps.
- [ ] Task: Build the `OnboardingCard` variant
    - [ ] Implement the high-impact layout (Large Icon, Bold Title).
    - [ ] Add the "Success/Celebration" state logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Interaction & Auto-Advance Logic
- [ ] Task: Wire up completion logic
    - [ ] Link "ACCEPT & SETUP" to `completeStep` in the shared hook.
- [ ] Task: Implement Auto-Advance
    - [ ] Use a `useEffect` with a timeout to trigger index increment after completion.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
