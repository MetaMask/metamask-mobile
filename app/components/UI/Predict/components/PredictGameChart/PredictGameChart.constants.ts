export const CHART_HEIGHT = 200;
export const FONT_SIZE_LABEL = 14;
export const FONT_SIZE_VALUE = 24;
export const LABEL_HEIGHT = 40;
export const MIN_LABEL_GAP = 8;
export const DOT_RADIUS = 6;
export const DOT_STROKE_WIDTH = 2;
export const GLOW_RADIUS = 16;
export const GLOW_OPACITY = 0.15;
export const LABEL_OFFSET_X = 12;
export const RIGHT_LABEL_OFFSET = 12;
export const LABEL_TEXT_OFFSET_Y = 8;
export const VALUE_TEXT_OFFSET_Y = 16;
export const TIMESTAMP_Y = 12;
export const CROSSHAIR_START_Y = 20;
export const CROSSHAIR_STROKE_WIDTH = 1;

export interface DotPosition {
  dotY: number;
  value: number;
  color: string;
  label: string;
}

export const getSeparatedLabelYPositions = (
  dotPositions: { dotY: number }[],
): number[] => {
  if (dotPositions.length < 2) {
    return dotPositions.map((pos) => pos.dotY);
  }

  const [first, second] = dotPositions;
  const gap = Math.abs(first.dotY - second.dotY);

  if (gap >= LABEL_HEIGHT + MIN_LABEL_GAP) {
    return [first.dotY, second.dotY];
  }

  const midPoint = (first.dotY + second.dotY) / 2;
  const offset = (LABEL_HEIGHT + MIN_LABEL_GAP) / 2;

  if (first.dotY < second.dotY) {
    return [midPoint - offset, midPoint + offset];
  }
  return [midPoint + offset, midPoint - offset];
};
