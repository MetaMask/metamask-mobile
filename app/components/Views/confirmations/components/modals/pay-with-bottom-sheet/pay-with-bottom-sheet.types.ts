import { ReactNode } from 'react';

export type PayWithSectionId =
  | 'perps'
  | 'predict'
  | 'bank-card'
  | 'crypto'
  | (string & {});

export type PayWithRowTrailingVariant = 'checkmark' | 'chevron' | 'none';

export interface PayWithRowConfig {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  isSelected?: boolean;
  isLastUsed?: boolean;
  trailingElement?: PayWithRowTrailingVariant | ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Section hooks return `null` when the section should not render in the
 * current flow (e.g. the Perps section returns null outside perps txs).
 * The orchestrator filters nulls out before rendering.
 */
export interface PayWithSectionConfig {
  id: PayWithSectionId;
  title: string;
  rows: PayWithRowConfig[];
  testID?: string;
}
