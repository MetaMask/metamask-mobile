const TICKS = [25, 50, 75] as const;

export type GraduationTickPosition = (typeof TICKS)[number];

export const GraduationProgressSelectors = {
  CARD: 'token-details-v1-graduation-card',
  TAG: 'token-details-v1-graduation-tag',
  PERCENT: 'token-details-v1-graduation-percent',
  BAR: 'token-details-v1-graduation-bar',
  FILL: 'token-details-v1-graduation-bar-fill',
  DETAIL: 'token-details-v1-graduation-detail',
  AURA: 'token-details-v1-graduation-aura',
  tick: (position: GraduationTickPosition) =>
    `token-details-v1-graduation-tick-${position}`,
};

export const GRADUATION_TICK_POSITIONS = TICKS;
