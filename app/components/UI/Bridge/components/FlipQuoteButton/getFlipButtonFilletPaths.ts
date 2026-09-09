/**
 * SVG paths for the four concave fillets where the swap-card gap meets the
 * flip-button ring. Each path is a curved triangle tangent to both the
 * horizontal gap edge and the button's outer circle.
 */

export const FLIP_BUTTON_SIZE = 52;
export const FLIP_BUTTON_RADIUS = FLIP_BUTTON_SIZE / 2;
export const FLIP_BUTTON_HALF_GAP = 4;
export const FLIP_BUTTON_FILLET_RADIUS = 12;
export const FLIP_BUTTON_CUTOUT_WIDTH = 160;
export const FLIP_BUTTON_CUTOUT_HEIGHT = 120;

const toFixed = (value: number): string => value.toFixed(3);

const createFilletPath = (signX: 1 | -1, signY: 1 | -1): string => {
  const radius = FLIP_BUTTON_RADIUS;
  const gap = FLIP_BUTTON_HALF_GAP;
  const fillet = FLIP_BUTTON_FILLET_RADIUS;
  const cx = FLIP_BUTTON_CUTOUT_WIDTH / 2;
  const cy = FLIP_BUTTON_CUTOUT_HEIGHT / 2;
  const filletOffsetX = Math.sqrt((radius + fillet) ** 2 - (gap + fillet) ** 2);
  const junctionX = Math.sqrt(radius ** 2 - gap ** 2);
  const scale = radius / (radius + fillet);

  const filletCenterX = cx + signX * filletOffsetX;
  const filletCenterY = cy + signY * (gap + fillet);
  const linePointX = filletCenterX;
  const linePointY = cy + signY * gap;
  const tangentX = cx + (filletCenterX - cx) * scale;
  const tangentY = cy + (filletCenterY - cy) * scale;
  const junctionPointX = cx + signX * junctionX;
  const junctionPointY = cy + signY * gap;
  const filletSweep = signX * signY < 0 ? 1 : 0;
  const circleSweep = filletSweep === 1 ? 0 : 1;

  return [
    `M ${toFixed(junctionPointX)} ${toFixed(junctionPointY)}`,
    `L ${toFixed(linePointX)} ${toFixed(linePointY)}`,
    `A ${fillet} ${fillet} 0 0 ${filletSweep} ${toFixed(tangentX)} ${toFixed(tangentY)}`,
    `A ${radius} ${radius} 0 0 ${circleSweep} ${toFixed(junctionPointX)} ${toFixed(junctionPointY)}`,
    'Z',
  ].join(' ');
};

export const getFlipButtonFilletPaths = (): string[] => [
  createFilletPath(-1, -1),
  createFilletPath(1, -1),
  createFilletPath(-1, 1),
  createFilletPath(1, 1),
];
