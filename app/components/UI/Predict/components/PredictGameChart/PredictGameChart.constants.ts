export const CHART_HEIGHT = 200;
export const TIMEFRAME_SELECTOR_RESERVED_HEIGHT = 56;
export const CHART_WITH_TIMEFRAME_SELECTOR_HEIGHT =
  CHART_HEIGHT + TIMEFRAME_SELECTOR_RESERVED_HEIGHT;
export const FONT_SIZE_LABEL = 14;
export const FONT_SIZE_VALUE = 24;
export const LABEL_HEIGHT = 40;
export const MIN_LABEL_GAP = 8;
export const DOT_RADIUS = 6;
export const DOT_STROKE_WIDTH = 2;
export const GLOW_RADIUS = 16;
export const GLOW_OPACITY = 0.15;
export const LABEL_OFFSET_X = 20;
export const RIGHT_LABEL_OFFSET = 20;
export const LABEL_TEXT_OFFSET_Y = 8;
export const VALUE_TEXT_OFFSET_Y = 16;
/**
 * Smallest vertical center a label may occupy. A label renders its small text
 * label above the value at `labelY - LABEL_TEXT_OFFSET_Y`, and that text ascends
 * by up to the label font size. Keeping `labelY` at or above this value ensures
 * the label text never clips against the top edge of the chart.
 */
export const MIN_LABEL_Y = LABEL_TEXT_OFFSET_Y + FONT_SIZE_LABEL;
/**
 * Largest vertical center a label may occupy. A label renders its value text
 * below the center, so keeping `labelY` at or below this value ensures the
 * value text never clips against the bottom edge of the chart.
 */
export const MAX_LABEL_Y = CHART_HEIGHT - LABEL_HEIGHT;
export const TIMESTAMP_Y = 12;
export const CROSSHAIR_START_Y = 20;
export const CROSSHAIR_STROKE_WIDTH = 1;
export const TIMESTAMP_TEXT_HALF_WIDTH = 75;

export interface DotPosition {
  dotY: number;
  value: number;
  color: string;
  label: string;
}

/**
 * Translates a pair of label centers vertically so both stay fully visible:
 * pulled up when the bottom value text would overflow the bottom edge, but
 * never so far that the top label text clips against the top edge.
 */
const fitLabelStackWithinChart = (positions: number[]): number[] => {
  const top = Math.min(...positions);
  const bottom = Math.max(...positions);

  let shift = bottom > MAX_LABEL_Y ? MAX_LABEL_Y - bottom : 0;
  if (top + shift < MIN_LABEL_Y) {
    shift = MIN_LABEL_Y - top;
  }

  return shift === 0 ? positions : positions.map((y) => y + shift);
};

export const getSeparatedLabelYPositions = (
  dotPositions: { dotY: number }[],
): number[] => {
  if (dotPositions.length < 2) {
    return dotPositions.map((pos) => pos.dotY);
  }

  const minSpacing = LABEL_HEIGHT + MIN_LABEL_GAP;

  // For 2 labels, use symmetric centering around the midpoint
  if (dotPositions.length === 2) {
    const [first, second] = dotPositions;
    const gap = Math.abs(first.dotY - second.dotY);

    if (gap >= minSpacing) {
      return fitLabelStackWithinChart([first.dotY, second.dotY]);
    }

    const midPoint = (first.dotY + second.dotY) / 2;
    const offset = minSpacing / 2;

    const centered =
      first.dotY < second.dotY
        ? [midPoint - offset, midPoint + offset]
        : [midPoint + offset, midPoint - offset];

    return fitLabelStackWithinChart(centered);
  }

  // For 3+ labels, sort by dot position and resolve overlaps from both edges so
  // neither the top label text nor the bottom value text clips.
  const order = dotPositions
    .map((pos, index) => ({ index, y: pos.dotY }))
    .sort((a, b) => a.y - b.y);

  const ys = order.map((entry) => entry.y);
  const lastIndex = ys.length - 1;

  // Push overlapping labels downward to enforce the minimum gap.
  for (let i = 1; i < ys.length; i++) {
    if (ys[i] - ys[i - 1] < minSpacing) {
      ys[i] = ys[i - 1] + minSpacing;
    }
  }

  // If the bottom value text would overflow, anchor the bottom label and push
  // the rest back up so the bottom stays visible (e.g. two outcomes clustered
  // near the chart floor).
  if (ys[lastIndex] > MAX_LABEL_Y) {
    ys[lastIndex] = MAX_LABEL_Y;
    for (let i = lastIndex - 1; i >= 0; i--) {
      if (ys[i + 1] - ys[i] < minSpacing) {
        ys[i] = ys[i + 1] - minSpacing;
      }
    }
  }

  // If there are too many labels to fit, guard the top edge and re-resolve
  // downward; the bottom may then sit just past MAX_LABEL_Y but within the chart.
  if (ys[0] < MIN_LABEL_Y) {
    ys[0] = MIN_LABEL_Y;
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] - ys[i - 1] < minSpacing) {
        ys[i] = ys[i - 1] + minSpacing;
      }
    }
  }

  const result = new Array<number>(dotPositions.length);
  order.forEach((entry, i) => {
    result[entry.index] = ys[i];
  });
  return result;
};
