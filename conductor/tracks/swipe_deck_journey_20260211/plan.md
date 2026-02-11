# Implementation Plan: Swipe Deck Onboarding Journey Variant

## Phase 1: View Architecture & Toggling
- [x] Task: Update OnboardingJourneyScreen Structure d460ca7
    - [ ] Implement a `journeyView` state (LIST vs DECK).
    - [ ] Build the Segmented Control component using MMDS.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Swipe Deck Component Development
- [x] Task: Build the `OnboardingDeck` component d460ca7
    - [ ] Implement the visual card stack effect (background layers).
    - [ ] Create the data mapping for the 3 onboarding steps.
- [x] Task: Build the `OnboardingCard` variant d460ca7
    - [ ] Implement the high-impact layout (Large Icon, Bold Title).
    - [ ] Add the "Success/Celebration" state logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Interaction & Auto-Advance Logic
- [x] Task: Wire up completion logic 7a72821
    - [x] Link "ACCEPT & SETUP" to `completeStep` in the shared hook.
- [x] Task: Implement Auto-Advance 7a72821
    - [x] Use a `useEffect` with a timeout to trigger index increment after completion.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
