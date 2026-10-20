import type { ReactNode } from 'react';

export type ActivityPhase = 'active' | 'paused' | 'dormant';

export interface ActivityPhaseInput {
  scrollY: number;
  viewportHeight: number;
  slotTop: number;
  slotHeight: number;
  margin: number;
  currentPhase: ActivityPhase | null;
}

export type ActivitySlotChildren =
  | ReactNode
  | ((state: { phase: ActivityPhase }) => ReactNode);
