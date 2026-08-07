# Drag-and-Drop in Watchlist: Technical Analysis

This document captures the trade-offs, bugs, and root-cause analysis from implementing drag-and-drop reordering in the Watchlist full-screen view.

---

## 1. The Network Badge Glitch (affects `react-native-reorderable-list` only)

This glitch is **specific to `react-native-reorderable-list`** because it forces cell remounts after reorder. `react-native-draggable-flatlist` does **not** remount cells, so this glitch does not occur with that library.

### What happens

After a drag-and-drop reorder, the network badge icon (the small chain logo overlaid on the token image) briefly jumps away from the token image and then snaps back into place. This produces a visible flicker that breaks the polished feel of the interaction.

### Root cause

The badge is rendered by `BadgeWrapper`, a shared design-system component. It uses a custom hook (`useComponentSize`) to measure the dimensions of its child (the token image) via `onLayout`, then absolutely positions the badge relative to those measurements.

```
BadgeWrapper
├── <View onLayout={measure}>{children}</View>   ← token image
└── <View style={computedPosition}>{badge}</View> ← network icon
```

When `BadgeWrapper` **mounts**, `containerSize` is `null`. The badge renders at a default/zero position until the first `onLayout` fires (~1 frame later) and provides the real measurements. This is normally invisible because it only happens once on screen entry.

The problem arises when `react-native-reorderable-list` **forces cells to remount** after reorder. On remount:

1. `useComponentSize` re-initializes `containerSize` to `null`
2. Badge renders at the wrong position for one frame
3. `onLayout` fires, `containerSize` updates, badge snaps to correct position

This unmount → remount cycle creates the visible badge jump.

### Why remounting happens

`react-native-reorderable-list` intentionally forces remounts by appending a toggling suffix to each cell's React `key`:

```typescript
// ReorderableListCore.tsx — the library's internal logic
const createCellKey = (cellKey: string) => {
  const mark = markedCellsRef.current?.get(cellKey) || 0;
  return `${cellKey}#${mark}`;  // toggles between #0 and #1
};

// Used as:
<ReorderableListCell key={createCellKey(cellKey)} ... />
```

After each reorder, cells in the affected range get their mark toggled. React sees a new key and destroys the old component instance, mounting a fresh one. This was the library's way of resetting internal animated transform values (`itemTranslateXY`) that would otherwise be stale.

### Trace evidence

Console logging confirmed the full remount cycle on every drop:

```
BADGE_TRACE onReorder (drop done) {from: 3, to: 0}
BADGE_TRACE row render  {symbol: 'AAVE', position: 0, renderCount: 1}  ← fresh instance
BADGE_TRACE row render  {symbol: 'APE',  position: 1, renderCount: 1}
BADGE_TRACE row UNMOUNT {symbol: 'AAVE', position: 3}  ← old instance destroyed
BADGE_TRACE row UNMOUNT {symbol: 'APE',  position: 0}
BADGE_TRACE row MOUNT   {symbol: 'AAVE', position: 0}  ← new instance created
BADGE_TRACE row MOUNT   {symbol: 'APE',  position: 1}
```

Every cell in the reorder range is destroyed and recreated, triggering the badge glitch.

---

## 2. Library Comparison

### Option A: `react-native-draggable-flatlist`

The more mature library (~2K GitHub stars). Uses a `CellRendererComponent` pattern where cells persist across reorders — **no forced remounts**.

**How it handles post-reorder positioning:**
Each cell has an `onCellLayout` callback that resets `heldTranslate` to 0 and re-measures when FlatList repositions cells after data changes. No key manipulation needed.

**Bugs encountered:**

- **Item disappears / layout shifts on drop**: After releasing a dragged item, it briefly vanishes and items below shift. This is an animation timing bug where `activeKey` and animated values aren't properly reset when data changes. It's a known issue ([GitHub issue #572](https://github.com/computerjazz/react-native-draggable-flatlist/issues/572)). A fix was merged ([PR #586](https://github.com/computerjazz/react-native-draggable-flatlist/pull/586)) and shipped in v4.0.3, but **multiple users report the glitch persists** on v4.0.3 (see issue comments from May 2025 through May 2026). The library appears to be in maintenance mode with no further fixes forthcoming.

**Workarounds attempted:**

- `requestAnimationFrame(() => setItems(data))` in `onDragEnd` — defers state update by one frame to let animations settle. Recommended by community but does not fully eliminate the glitch in our testing.

**Patch required:** None available that fully resolves the issue. The v4.0.3 fix was insufficient.

**Badge glitch:** None. Cells are never remounted, so `BadgeWrapper` state is preserved.

| Aspect                | Assessment                                                                  |
| --------------------- | --------------------------------------------------------------------------- |
| Remount on reorder    | No                                                                          |
| Badge glitch          | No                                                                          |
| Drop animation glitch | Yes — persists even in v4.0.3 with community workarounds                    |
| Patch needed          | No effective patch available                                                |
| API familiarity       | Widely used, lots of community examples                                     |
| Maintenance status    | Appears abandoned — last meaningful update May 2025, open issues unresolved |

### Option B: `react-native-reorderable-list`

Newer library with smoother drag animations out of the box. Uses Reanimated worklets for gesture handling.

**How it handles post-reorder positioning:**
Forces cell remounts via key toggling (`createCellKey`). This is a brute-force approach to resetting the `itemTranslateXY` shared values in `ReorderableListCell`. Without remounting, cells retain their drag transform offsets and appear in wrong positions.

**Bugs encountered:**

- **Badge glitch**: Network icon jumps on every drop due to forced remounts (see Section 1).
- **Items in wrong positions after patching remount away**: Removing the key toggle without compensating causes cells to retain stale animated offsets.

**Patch required:** Two-part patch:

1. Remove `createCellKey` usage → use stable `cellKey` as React key (prevents remount)
2. Add `useAnimatedReaction` in `ReorderableListCell` to reset `itemTranslateXY` to 0 when `draggedIndex` goes to -1 (replaces the work remounting was doing)

**Badge glitch:** Present without patch. The two-part patch (prevent remount + reset transforms) eliminates the badge position jump, but a brief visual glitch remains where the list order momentarily reverts to the pre-drop order before settling into the correct order. This suggests there is still a timing gap between when the animated transforms reset and when React re-renders with the updated data array.

| Aspect               | Assessment                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| Remount on reorder   | Yes (by design)                                                           |
| Badge glitch         | Yes (caused by remount)                                                   |
| Animation smoothness | Smooth out of the box                                                     |
| Patch needed         | Yes (prevent remount + reset transforms)                                  |
| API similarity       | Similar to draggable-flatlist (`renderItem`, `keyExtractor`, `onReorder`) |
| Maintenance status   | More actively maintained                                                  |

### Option C: DIY with `react-native-reanimated` + `react-native-gesture-handler`

Both libraries are already project dependencies. A custom implementation would avoid third-party bugs entirely but requires significant effort.

**What you'd need to build:**

- Gesture handling: `Gesture.Pan()` with long-press activation, tracking translation
- Hit testing: Determine which item the dragged item is hovering over based on accumulated gesture translation and item offsets
- Displacement animations: Animate non-dragged items up/down to make room, using `withTiming` on shared values
- Snap-to-position: On release, animate the dragged item to its final slot
- Auto-scroll: If the list is scrollable, detect when the drag approaches edges and scroll
- State synchronization: Map animated positions back to data array order after drop
- Layout measurement: Track each cell's offset and size for hit-test math

**Position math example (simplified):**

```typescript
// During drag, for each non-dragged item:
const shouldDisplace = dragCenterY > itemTop && dragCenterY < itemBottom;
const displacement = shouldDisplace
  ? dragDirection === 'down'
    ? -draggedItemHeight
    : draggedItemHeight
  : 0;
translateY.value = withTiming(displacement);

// On release, snap dragged item:
const targetOffset = items
  .slice(0, newIndex)
  .reduce((sum, item) => sum + item.height, 0);
dragTranslateY.value = withTiming(targetOffset - originalOffset);
```

This gets significantly more complex with variable-height items, edge cases (dragging first/last item), and scroll containers.

| Aspect               | Assessment                                           |
| -------------------- | ---------------------------------------------------- |
| Remount on reorder   | No (you control rendering)                           |
| Badge glitch         | No                                                   |
| Animation smoothness | Full control                                         |
| Patch needed         | No                                                   |
| Development effort   | High (~500-800 lines of gesture + animation logic)   |
| Maintenance burden   | Ongoing — you own all the edge cases                 |
| Risk                 | Subtle bugs in gesture math, auto-scroll, edge cases |

---

## 3. Summary of Trade-offs

| Factor              | draggable-flatlist                  | reorderable-list                      | DIY                       |
| ------------------- | ----------------------------------- | ------------------------------------- | ------------------------- |
| Badge glitch risk   | None                                | High (needs patch)                    | None                      |
| Drop animation bug  | Yes — persists despite v4.0.3 fix   | Partial (order-revert flash remains)  | N/A                       |
| Total patch surface | 0 (no effective patch)              | ~20 lines                             | 0                         |
| Code you maintain   | Workaround only                     | Patch only                            | ~500-800 lines            |
| Drag smoothness     | Good during drag, glitch on drop    | Excellent during drag, glitch on drop | Depends on implementation |
| Community support   | Large but library appears abandoned | Growing, actively maintained          | None                      |

**Key distinction:** The network badge glitch is exclusive to `react-native-reorderable-list` (caused by forced remounts). `react-native-draggable-flatlist` does not have this issue. However, both libraries share a separate, unrelated drop-animation glitch (brief layout shift when an item is released). Neither library delivers a fully glitch-free drop experience. A spike is recommended to evaluate additional options.

---

## 4. Current Approach

We use `react-native-draggable-flatlist@4.0.3` with a `requestAnimationFrame` workaround in `onDragEnd`. This avoids the badge glitch entirely (no cell remounts) but the drop-animation glitch (brief layout shift on item release) persists. This is a known unresolved issue in the library.

Previously we used `react-native-reorderable-list@0.18.0` with a two-part patch (prevent remount + reset transforms). That eliminated the badge glitch but also had a drop-animation glitch, and required maintaining a patch.

---

## 5. Open Questions / Next Steps

- **Spike recommended**: Neither explored library is fully glitch-free. A dedicated spike could evaluate:
  - Other React Native drag-and-drop libraries (e.g. `@mgcrea/react-native-dnd`, or newer alternatives that may have emerged)
  - A lightweight DIY approach scoped to our specific use case (fixed-height rows, no nested scroll, small list) which would be simpler than a general-purpose solution
  - Whether the glitch is acceptable for an MVP release, with a follow-up ticket to improve the experience
- **Badge resilience**: Independently, `BadgeWrapper` could be made more resilient to remounts by caching its last known `containerSize` or using `initialSize` props — this would protect against the glitch regardless of which DND library is used
- **Upstream**: `react-native-draggable-flatlist` appears to be in maintenance mode (last meaningful update May 2025). `react-native-reorderable-list` is more actively maintained but has the remount-by-design issue
