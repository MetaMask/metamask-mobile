# Specification: Swipe Deck Onboarding Journey Variant

## Overview
This feature introduces a second layout option for the Onboarding Journey screen: a "Swipe Deck" view. Users can toggle between the existing list-based view and this new card-based interface using a segmented control.

## Functional Requirements

### 1. View Toggling
- A **Segmented Control** (List vs. Deck) is placed at the top of the `OnboardingJourneyScreen`.
- Toggling immediately switches the content between the standard checklist and the new Swipe Deck.

### 2. Swipe Deck UI
- **Card Stack:** A visual stack of cards representing onboarding tasks.
- **Card Content:** Each card includes:
  - High-impact icon and typography.
  - Brief description of the task.
  - "ACCEPT & SETUP" primary action.
  - "SKIP CARD" secondary action.
- **Visuals:** Uses a high-fidelity design with background card shadows to simulate a real physical deck.

### 3. Interaction & Logic (Prototype Focus)
- **Simulated Completion:** Clicking "ACCEPT & SETUP" marks the current step as completed within the shared prototype state.
- **Celebration State:** Upon completion, the card transitions to a "Success" state (e.g., background turns green).
- **Auto-Advance:** After 1-2 seconds in the celebration state, the deck automatically advances to the next incomplete card.
- **Manual Navigation:** Users can use "SKIP CARD" to cycle through the deck without completing actions.

### 4. Shared State Integration
- Both views (List and Deck) utilize the same `useOnboardingChecklist` hook to ensure completion states stay in sync regardless of which view the user is in.

## Acceptance Criteria
- [ ] Segmented control correctly switches between List and Deck views.
- [ ] Swipe Deck renders cards with the specified "stack" effect.
- [ ] Primary button correctly updates the shared completion state.
- [ ] Card shows a green "celebration" state before auto-advancing.
- [ ] All three steps (SRP, Funds, Card) are represented in the deck.
