export const PositionTypes = ['supply', 'stake', 'borrow', 'reward'] as const;
export type PositionType = (typeof PositionTypes)[number];
