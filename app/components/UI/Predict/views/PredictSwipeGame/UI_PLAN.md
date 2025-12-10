# Predict Swipe Game - UI Redesign Plan

## Current Problems

Based on the screenshot, the current UI has critical issues:

| Problem | Impact |
|---------|--------|
| Bet Amount section is massive | Steals focus from the card |
| Card is cramped and small | Should be the hero element |
| YES/NO indicators are too large and amateur | Distracting, unprofessional |
| Too much visual noise | Hard to focus on what matters |
| Poor contrast and hierarchy | Everything competes for attention |
| Preset buttons take too much space | Not the primary action |
| Text-heavy indicators | Should use visual language |

---

## Design Philosophy

### Core Principles

1. **The Card IS the Experience**
   - Card should occupy 65-75% of visible screen
   - Everything else is secondary
   - User's eye should immediately go to the card

2. **Progressive Disclosure**
   - Show minimal UI at rest
   - Reveal information during gestures
   - Details appear when needed, disappear when not

3. **Gesture-First Design**
   - UI should encourage swiping
   - Minimize buttons and tappable elements
   - The card itself is the primary interactive element

4. **Visual Language Over Text**
   - Use colors, icons, and animations
   - Reduce text labels wherever possible
   - Let the design speak

5. **Generous Whitespace**
   - Let elements breathe
   - Create clear visual separation
   - Don't fill every pixel

---

## New Layout Architecture

```
┌──────────────────────────────────────────┐
│  ← Back                        $5 ▼  💰  │ ← Minimal header (48px)
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │          [MARKET IMAGE]            │  │
│  │                                    │  │
│  │    ┌─────────────────────────┐     │  │
│  │    │   Ends in 3 days        │     │  │
│  │    └─────────────────────────┘     │  │
│  │                                    │  │
│  │  ──────────────────────────────── │  │
│  │  │                              │ │  │
│  │  │   Will Bitcoin hit $100k    │ │  │
│  │  │   by end of year?           │ │  │
│  │  │                              │ │  │
│  │  │   ┌─────┐       ┌─────┐     │ │  │
│  │  │   │ NO  │       │ YES │     │ │  │
│  │  │   │ 23¢ │       │ 77¢ │     │ │  │
│  │  │   └─────┘       └─────┘     │ │  │
│  │  │                              │ │  │
│  │  └──────────────────────────────┘ │  │
│  └────────────────────────────────────┘  │
│                                          │
│              ↓ Skip                      │ ← Subtle hint (32px)
│                                          │
│         ● ● ○ ○ ○ ○ ○ ○               │ ← Progress dots (24px)
└──────────────────────────────────────────┘
```

### Height Distribution

| Element | Height | Purpose |
|---------|--------|---------|
| Header | 48-56px | Back button + bet amount chip |
| Card Area | ~65% | The main event |
| Bottom Area | ~15% | Skip hint + progress |
| Safe Areas | Variable | iOS/Android padding |

---

## Component Redesign

### 1. Header (Minimal Chrome)

**Current**: Massive bet selector with presets
**New**: Slim header with just essentials

```
┌──────────────────────────────────────────┐
│  ←                              $5 ▼  💰 │
└──────────────────────────────────────────┘
     │                              │    │
     │                              │    └── Balance indicator
     │                              └─────── Bet chip (tappable)
     └────────────────────────────────────── Back button
```

**Bet Amount Chip Specs:**
- Small pill shape: `px-3 py-1.5`
- Background: `bg-muted` (subtle)
- Font: `BodyMdBold`
- Chevron icon to indicate tappable
- On tap → Opens bottom sheet

**Bottom Sheet for Bet Amount:**
- Slides up from bottom
- Preset buttons in 2 rows
- Custom input option
- Balance display
- "Apply" button

### 2. The Card (Hero Element)

**Design Goals:**
- Maximum visual impact
- Clean, magazine-style layout
- Information hierarchy: Image → Title → Odds

```
┌────────────────────────────────────────┐
│                                        │
│           [LARGE IMAGE]                │
│                                        │
│    ┌──────────────────┐                │
│    │  ⏰ Ends Dec 15  │                │
│    └──────────────────┘                │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← Gradient overlay
├────────────────────────────────────────┤
│                                        │
│   Will Bitcoin hit $100k by EOY?       │ ← Title (HeadingLg)
│                                        │
│   ┌─────────────┐   ┌─────────────┐    │
│   │     NO      │   │     YES     │    │
│   │    23¢      │   │    77¢      │    │
│   └─────────────┘   └─────────────┘    │
│                                        │
│         Vol: $1.2M • Politics          │ ← Metadata (BodySm)
│                                        │
└────────────────────────────────────────┘
```

**Card Specifications:**

| Element | Style |
|---------|-------|
| Container | `rounded-3xl`, `shadow-2xl`, full width minus 32px margin |
| Image | 50% of card height, `cover`, `rounded-t-3xl` |
| Gradient | Black gradient from bottom, 30% height |
| Date badge | Floating top-right, `bg-black/60`, `rounded-full` |
| Content area | `p-5`, `bg-default` |
| Title | `HeadingLg`, max 3 lines |
| Odds pills | Side by side, colored backgrounds |
| Metadata | `BodySm`, `text-muted` |

**Odds Pills Design:**

```
┌───────────────────────────────────────┐
│   ┌─────────────┐   ┌─────────────┐   │
│   │     NO      │   │     YES     │   │
│   │    23¢      │   │    77¢      │   │
│   │             │   │             │   │
│   │  +$3.35     │   │  +$0.30     │   │
│   │  if correct │   │  if correct │   │
│   └─────────────┘   └─────────────┘   │
└───────────────────────────────────────┘
      ↑ Red tint         ↑ Green tint
```

**Pill Specs:**
- NO: `bg-error-muted`, border: `border-error-default/20`
- YES: `bg-success-muted`, border: `border-success-default/20`
- Size: 45% width each, centered with gap
- Font: Title `BodyLgBold`, Price `HeadingMd`, Win `BodySm`

### 3. Swipe Feedback (Progressive Reveal)

**At Rest**: No indicators visible
**During Swipe**: Overlay appears on card

**Swiping Right (YES):**
```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  ╔═══════════════════════════╗   │  │
│  │  ║                           ║   │  │
│  │  ║      ✓ YES                ║   │  │ ← Green overlay
│  │  ║                           ║   │  │    on card
│  │  ║      Bet $5 to win $6.50  ║   │  │
│  │  ║                           ║   │  │
│  │  ╚═══════════════════════════╝   │  │
│  │           [CARD TILTS →]         │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Swipe Overlay Specs:**
- Appears at 20% swipe threshold
- Opacity increases with swipe distance (0 → 0.85)
- YES: Green gradient `success-default/80`
- NO: Red gradient `error-default/80`
- SKIP: Gray gradient `muted/80`

**Overlay Content:**
- Large checkmark (YES) or X (NO) or arrow (SKIP)
- "Bet $X to win $Y" text
- All text white/inverse

### 4. Skip Hint (Subtle)

**Current**: Big skip indicator taking space
**New**: Minimal text hint

```
         ↓ Swipe down to skip
```

- Font: `BodySm`
- Color: `text-muted`
- Opacity: 50%
- Centered at bottom
- Disappears after first skip (user learned)

### 5. Progress Indicator

**Current**: "40 cards remaining" text
**New**: Visual dots

```
         ● ● ● ○ ○ ○ ○ ○ ○ ○
               ↑ current
```

- Show max 10 dots
- Filled = completed, empty = remaining
- Current has subtle pulse animation
- Below skip hint
- Disappears during swipe

### 6. Undo Toast (Refined)

**Current**: Large toast with circular progress
**New**: Sleeker, less intrusive

```
┌─────────────────────────────────────────┐
│  ✓ YES on "Bitcoin $100k" • Tap to undo │
│  ████████████░░░░░░░░░░░░░░░░░░░  3s    │
└─────────────────────────────────────────┘
```

- Single line message
- Linear progress bar (not circular)
- Positioned at very bottom (above safe area)
- Blurred background
- Subtle shadow
- Tap anywhere to undo

---

## Color System

### Light Mode

| Element | Color Token | Hex |
|---------|-------------|-----|
| YES background | `success-muted` | #E6F9ED |
| YES text | `success-default` | #28A745 |
| YES accent | `success-default` | #28A745 |
| NO background | `error-muted` | #FDECEA |
| NO text | `error-default` | #D73A49 |
| NO accent | `error-default` | #D73A49 |
| Skip background | `muted` | #F2F4F6 |
| Card background | `default` | #FFFFFF |
| Card shadow | black/15 | - |

### Swipe Overlay Colors

| Direction | Gradient |
|-----------|----------|
| YES (Right) | Linear gradient, green 80% opacity |
| NO (Left) | Linear gradient, red 80% opacity |
| SKIP (Down) | Linear gradient, gray 70% opacity |

---

## Animation Specifications

### 1. Card Entry
- **Trigger**: New card appears
- **Animation**: Scale from 0.9 → 1.0, opacity 0 → 1
- **Duration**: 250ms
- **Easing**: `easeOutBack`

### 2. Levitate (Idle)
- **Trigger**: Card is active
- **Animation**: translateY oscillates ±4px (reduced from 8px)
- **Duration**: 2000ms per cycle
- **Easing**: `easeInOut`

### 3. Swipe
- **Trigger**: User drags
- **Animation**: 
  - Card follows finger
  - Rotation: max ±12° based on X position
  - Overlay opacity increases
- **Physics**: Spring damping 15, stiffness 150

### 4. Swipe Complete
- **Trigger**: Threshold crossed
- **Animation**: Card flies off screen
- **Duration**: 200ms
- **Easing**: `easeIn`

### 5. Snap Back
- **Trigger**: Swipe not completed
- **Animation**: Card returns to center
- **Duration**: 300ms
- **Easing**: Spring with overshoot

### 6. Stack Cards
- **Background cards**:
  - Scale: 0.95 per level
  - TranslateY: +8px per level
  - Opacity: -0.15 per level

---

## Responsive Considerations

### Small Phones (iPhone SE, etc.)
- Reduce image height to 40%
- Smaller title font
- Compact odds pills
- Hide skip hint after first use

### Large Phones / Tablets
- Max card width: 400px
- Center card horizontally
- More generous padding
- Larger tap targets

---

## Interaction States

### Card States
1. **Idle**: Slight levitate, full opacity
2. **Dragging**: Follows touch, rotates, shows overlay
3. **Threshold Reached**: Haptic, overlay fully visible
4. **Releasing (below threshold)**: Snap back
5. **Releasing (above threshold)**: Fly away, trigger action

### Bet Chip States
1. **Default**: Muted background
2. **Pressed**: Scale 0.95, darker background
3. **Disabled**: 50% opacity (during order)

---

## Implementation Checklist

### Phase 1: Layout Restructure
- [ ] Redesign header to minimal chip
- [ ] Remove inline bet presets
- [ ] Expand card to fill available space
- [ ] Remove side YES/NO indicators
- [ ] Add subtle skip hint at bottom

### Phase 2: Card Redesign
- [ ] Increase image height (50% of card)
- [ ] Add gradient overlay on image
- [ ] Redesign odds pills (inside card)
- [ ] Add "potential win" to pills
- [ ] Improve typography hierarchy

### Phase 3: Swipe Feedback
- [ ] Remove permanent side indicators
- [ ] Add card overlay during swipe
- [ ] Implement color tint based on direction
- [ ] Show bet/win info in overlay
- [ ] Add checkmark/X/arrow icons

### Phase 4: Bottom Sheet
- [ ] Create bet amount bottom sheet
- [ ] Add preset buttons (2 rows)
- [ ] Add custom input
- [ ] Show balance
- [ ] Animate open/close

### Phase 5: Polish
- [ ] Refine all animations
- [ ] Add haptic feedback refinements
- [ ] Tune spring physics
- [ ] Test on multiple devices
- [ ] Dark mode support

---

## Visual Mockup (ASCII)

### Before (Current)
```
┌────────────────────────────────────────┐
│ ←              Bet Amount              │
│               $5                       │
│  [$1] [$5] [$10] [$25] [$50] [$100]   │  ← TOO BIG
├────────────────────────────────────────┤
│ ┌────┐ ┌──────────────────┐ ┌────┐    │
│ │ NO │ │                  │ │YES │    │  ← CRAMPED
│ │100¢│ │  [Small Card]    │ │ 0¢ │    │
│ │+$5 │ │                  │ │+$X │    │
│ └────┘ └──────────────────┘ └────┘    │
│                                        │
│           40 cards remaining           │
└────────────────────────────────────────┘
```

### After (Redesigned)
```
┌────────────────────────────────────────┐
│ ←                            [$5 ▼] 💰 │  ← Minimal
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │      [LARGE BEAUTIFUL IMAGE]       │ │
│ │                      ┌──────────┐  │ │
│ │                      │⏰ 3 days │  │ │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓└──────────┘▓▓│ │
│ ├────────────────────────────────────┤ │
│ │                                    │ │
│ │  Will Bitcoin hit $100k by EOY?    │ │  ← HERO CARD
│ │                                    │ │
│ │  ┌──────────┐    ┌──────────┐      │ │
│ │  │   NO     │    │   YES    │      │ │
│ │  │   23¢    │    │   77¢    │      │ │
│ │  │ +$3.35   │    │ +$0.30   │      │ │
│ │  └──────────┘    └──────────┘      │ │
│ │                                    │ │
│ │       Vol: $1.2M • Politics        │ │
│ └────────────────────────────────────┘ │
│                                        │
│            ↓ Skip                      │  ← Subtle
│          ●●●○○○○○○○                    │
└────────────────────────────────────────┘
```

---

## Success Metrics

After redesign, the UI should:

1. ✅ Card is immediately the focus
2. ✅ Bet amount is accessible but not prominent
3. ✅ YES/NO options are clear but integrated into card
4. ✅ Swipe feedback is immersive (overlay on card)
5. ✅ Minimal text, maximum visual impact
6. ✅ Professional, polished appearance
7. ✅ Easy to use for first-time users
8. ✅ Efficient for power users

---

---

## Additional Requirements (User Feedback)

### 1. Card Stack Visibility
- Show 2-3 cards behind the active card
- Each subsequent card should be:
  - Scaled down (0.92 per level)
  - Offset vertically (+12px per level)
  - Slightly faded (0.7 opacity per level)
- Creates depth and indicates more cards

### 2. Prominent Swipe Feedback
- When dragging LEFT/RIGHT, the corresponding option becomes VERY prominent
- The selected direction's pill/overlay should:
  - Scale up (1.1x)
  - Increase opacity to full
  - Add glow/shadow effect
  - Show potential winnings prominently
- The opposite direction fades out

### 3. Skip with UP or DOWN
- Swipe DOWN → Skip (existing)
- Swipe UP → Skip (new, same action)
- Both directions work for skipping
- Makes it more intuitive for users

### 4. Bug Fix: Skip Stops Game
- **Issue**: After skipping, card animated values don't reset
- **Fix**: Reset translateX/Y/opacity/rotation after skip animation
- Ensure next card starts fresh at center

---

## Next Steps

1. **Review this plan** and adjust based on feedback
2. **Fix skip bug** (immediate priority)
3. **Implement Phase 1** (Layout restructure)
4. **Implement Phase 2** (Card redesign)
5. **Implement Phase 3** (Swipe feedback)
6. **Implement Phase 4** (Bottom sheet)
7. **Polish and test** (Phase 5)

Estimated time: 2-3 days of focused work

