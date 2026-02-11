# Implementation Plan: Onboarding Checklist Prototype

## Phase 1: Foundation & "Demo Controller"

- [x] Task: Create the checklist state management (Local Prototype State) 5b73854
  - [ ] Define `useOnboardingChecklist` hook to manage step completion and UI variation states.
  - [ ] Implement a simple "Demo Trigger" (e.g., long press on header) to toggle UI modes.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: UI Component Development (MMDS)

- [x] Task: Build the "Checklist Item" base component 80172
  - [ ] Create a reusable MMDS component for checklist rows with checkmarks.
- [ ] Task: Build the "Banner" Layout
  - [ ] Implement the top-of-page container using `MMDS.Box`.
- [ ] Task: Build the "Floating Bottom" Layout
  - [ ] Implement the sticky bottom component.
  - [ ] Add scroll-listener logic to hide/show based on direction.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Step Logic & Navigation

- [ ] Task: Implement Step 1 & 2 Logic
  - [ ] Wire up SRP detection (Step 1) and Balance detection (Step 2).
- [ ] Task: Implement Step 3 Variations
  - [ ] Create the "Single CTA" view for Step 3.
  - [ ] Create the "Expanding Dropdown" view for Step 3.
- [ ] Task: Integrate with Homepage Redesign
  - [ ] Inject the checklist into the `Homepage` component (enabled by the feature flag).
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
