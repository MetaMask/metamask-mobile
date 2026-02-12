# Implementation Plan: Onboarding Checklist Prototype

## Phase 1: Foundation & "Demo Controller"

- [x] Task: Create the checklist state management (Local Prototype State) 5b73854
  - [ ] Define `useOnboardingChecklist` hook to manage step completion and UI variation states.
  - [ ] Implement a simple "Demo Trigger" (e.g., long press on header) to toggle UI modes.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: UI Component Development (MMDS)

- [x] Task: Build the "Checklist Item" base component 80172
  - [ ] Create a reusable MMDS component for checklist rows with checkmarks.
- [x] Task: Build the "Banner" Layout 03e99f8
  - [ ] Implement the top-of-page container using `MMDS.Box`.
- [x] Task: Build the "Floating Bottom" Layout 1ed959e
  - [ ] Implement the sticky bottom component.
  - [ ] Add scroll-listener logic to hide/show based on direction.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Step Logic & Navigation

- [x] Task: Implement Step 1 - [~] Task: Implement Step 1 & 2 Logic 2 Logic 9d354e7
  - [ ] Wire up SRP detection (Step 1) and Balance detection (Step 2).
- [x] Task: Implement Step 3 Variations 261a223
  - [ ] Create the "Single CTA" view for Step 3.
  - [ ] Create the "Expanding Dropdown" view for Step 3.
- [x] Task: Integrate with Homepage Redesign ef56ff1
  - [ ] Inject the checklist into the `Homepage` component (enabled by the feature flag).
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
