# Specification: Redesign of Onboarding Checklist Style 2

## Overview
This track replaces the previous "Integrated Minimalist" Style 2 with a premium **"Sleek Timeline"** design. This new version focuses on high-impact visuals, dynamic animations, and MetaMask brand colors to compete with the "Modern Fintech" and "Glassmorphism" variants.

## Functional Requirements

### 1. The "Sleek Timeline" UI
- **Vertical Progress Line:** A prominent vertical line on the left side connecting all three steps.
  - **Completed:** Solid MetaMask Orange (#F6851B).
  - **Incomplete:** Light grey dashed line.
  - **Glow Effect:** A subtle orange gradient/glow around the completed segments of the line.
- **Pulse Indicator:** A small, animated orange dot that pulses at the start of the *current* incomplete task.
- **Iconography:** Large, outlined icons representing each step.
- **Spacing:** Airy, borderless layout that integrates seamlessly with the Homepage background.

### 2. Branding & Colors
- **Primary Color:** Strictly use MetaMask Orange for active/completed states.
- **Backgrounds:** Transparent or very subtle light backgrounds to maintain the "Sleek" look.

### 3. Interaction & Demo Logic
- **CTAs:** Clicking a timeline row triggers the same navigation actions as the other styles.
- **Reset:** The "..." reset icon is removed from this style to prioritize a clean visual. Users can switch to Style 1 or 3 to reset, or use the "Onboarding Complete" banner.

## Acceptance Criteria
- [ ] Style 2 correctly renders the vertical timeline with solid/dashed segments.
- [ ] MetaMask Orange is used for the active/completed line sections.
- [ ] A subtle glow/gradient effect is visible on the progress line.
- [ ] A pulsing dot indicates the current active step.
- [ ] Design is airy, borderless, and feels "premium."
