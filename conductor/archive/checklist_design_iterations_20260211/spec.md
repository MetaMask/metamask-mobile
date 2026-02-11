# Specification: Onboarding Checklist Design Iterations

## Overview
This track focuses on implementing 2-3 distinct, "cleaner" design variations for the onboarding checklist prototype. These variations will be toggleable via the existing demo trigger (long-press on "Tokens") to facilitate stakeholder feedback on the visual identity.

## Functional Requirements

### 1. Design Style Cycling
- The existing long-press trigger on the "Tokens" section title will be enhanced to cycle through three distinct design styles:
  - **Style 1: Modern Fintech** (Individual cards, step-based progress segments).
  - **Style 2: Integrated Minimalist** (Dividers only, context menu reset).
  - **Style 3: Glassmorphism** (Elevated card, frosted success badges).

### 2. Style Implementation Details

#### Style 1: Modern Fintech (Default)
- **UI:** Each step is presented in its own MMDS `Box` with subtle borders and shadows.
- **Progress:** A horizontal progress bar with three distinct segments at the top of the main container.

#### Style 2: Integrated Minimalist
- **UI:** Steps are separated by simple dividers, utilizing the existing homepage section background.
- **Reset:** A small "..." icon opens a menu or simple toggle for resetting the state.

#### Style 3: Glassmorphism / Elevation
- **UI:** A single, large elevated card contains all checklist items with ample whitespace.
- **Success Badge:** Completed items show a frosted glass circular badge with a green checkmark outline.

### 3. State Management
- Extend `useOnboardingChecklist` to include a `designStyle` property.
- Ensure the selected style persists during the session but can be cycled instantly.

## Acceptance Criteria
- [ ] Long-press on "Tokens" cycles through all 3 styles correctly.
- [ ] "Modern Fintech" shows segmented progress bar.
- [ ] "Integrated Minimalist" uses a "..." context menu for reset.
- [ ] "Glassmorphism" features elevated cards and frosted badges.
- [ ] All CTAs and completion logic from the previous prototype remain functional in all styles.
