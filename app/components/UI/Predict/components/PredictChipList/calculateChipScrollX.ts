/** Must match the `px-4` applied to ScrollView contentContainerStyle. */
const CONTENT_PADDING = 16;

export function calculateChipScrollX(
  chipIndex: number,
  chipsCount: number,
  layouts: ReadonlyMap<number, { x: number; width: number }>,
  viewportWidth: number,
): number | null {
  const selected = layouts.get(chipIndex);
  if (!selected) return null;

  const leftIdx = Math.max(0, chipIndex - 1);
  const rightIdx = Math.min(chipsCount - 1, chipIndex + 1);
  const leftChip = layouts.get(leftIdx);
  const rightChip = layouts.get(rightIdx);
  if (!leftChip || !rightChip) return null;

  const rangeLeft = leftChip.x - CONTENT_PADDING;
  const rangeRight = rightChip.x + rightChip.width + CONTENT_PADDING;
  const rangeWidth = rangeRight - rangeLeft;

  let scrollX: number;
  if (rangeWidth <= viewportWidth) {
    scrollX = rangeLeft - (viewportWidth - rangeWidth) / 2;
  } else {
    scrollX = selected.x + selected.width / 2 - viewportWidth / 2;
  }

  return Math.max(0, scrollX);
}
