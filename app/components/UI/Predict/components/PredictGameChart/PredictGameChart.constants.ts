export const CHART_HEIGHT = 200;
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

export const getSeparatedLabelYPositions = (
  dotPositions: { dotY: number }[],
): number[] => {
  if (dotPositions.length < 2) {
    return dotPositions.map((pos) => pos.dotY);
  }

  const minSpacing = LABEL_HEIGHT + MIN_LABEL_GAP;
  const positions = dotPositions.map((pos, index) => ({
    index,
    y: pos.dotY,
  }));

  positions.sort((a, b) => a.y - b.y);

  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i].y - positions[i - 1].y;
    if (gap < minSpacing) {
      positions[i].y = positions[i - 1].y + minSpacing;
    }
  }

  const result = new Array<number>(dotPositions.length);
  for (const pos of positions) {
    result[pos.index] = pos.y;
  }
  return result;
};
