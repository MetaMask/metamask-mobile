// TODO: Export from @metamask/assets-controllers
export const PositionTypes = ['supply', 'stake', 'borrow', 'reward'] as const;
export type PositionType = (typeof PositionTypes)[number];
