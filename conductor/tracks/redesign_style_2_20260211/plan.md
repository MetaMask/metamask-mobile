# Implementation Plan: Redesign of Onboarding Checklist Style 2

## Phase 1: Foundation & "Sleek Timeline" Component
- [x] Task: Create `TimelineProgressBar` component 89164
    - [ ] Build the vertical line with solid (completed) and dashed (incomplete) segments.
    - [ ] Implement the glow/gradient effect using `twrnc` shadows or `LinearGradient` if available.
    - [ ] Add the animated pulsing dot for the current active step.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Integration & Styling
- [x] Task: Update `ChecklistItem` for Timeline Layout 26c460d
    - [ ] Modify the `Minimal` variant in `ChecklistItem.tsx` to align with the new timeline structure (remove borders, increase icon size, transparent bg).
    - [ ] Ensure the step icon aligns perfectly with the vertical progress line.
- [ ] Task: Update `OnboardingBanner`
    - [ ] Refactor the `Style 2` rendering block to use the new `TimelineProgressBar` container.
    - [ ] Remove the "..." reset icon logic from this specific style block.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)
