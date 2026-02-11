# Implementation Plan: Floating Onboarding Mini-Bar Prototype

## Phase 1: Foundation & Navigation
- [x] Task: Extend state for the 4th UI variant eb0443b
    - [ ] Update `useOnboardingChecklist` hook to include `DESIGN_STYLE.MINI_BAR` (Option 4).
- [x] Task: Register the Onboarding Journey Screen eb0443b
    - [ ] Create a placeholder `OnboardingJourneyScreen.tsx`.
    - [ ] Register the new screen in the navigation stack (within the prototype folder/index).
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: UI Component Development (MMDS)
- [x] Task: Build the Floating Mini-Bar component 4461c67
    - [ ] Implement the segmented progress line/bar UI.
    - [ ] Add the `Animated` slide-up/down logic based on scroll position.
- [x] Task: Build the Onboarding Journey Screen 4461c67
    - [ ] Implement the full-screen layout with 3 steps.
    - [ ] Reuse the step detection and navigation logic from previous iterations.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Integration & Demo Logic
- [ ] Task: Update Demo Trigger Cycling
    - [ ] Modify `TokensSection.tsx` to include the 4th cycle option.
- [ ] Task: Inject Mini-Bar into Homepage
    - [ ] Add the `OnboardingMiniBar` component to the `Homepage.tsx` view (conditionally rendered).
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
