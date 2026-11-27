/* eslint-disable @typescript-eslint/naming-convention */

export type VaultApyHistoryStatus = 'available' | 'unavailable';

export type VaultApyHistoryDirection = 'increase' | 'decrease' | 'unchanged';

export interface VaultApyHistoryDailyPoint {
  boundary_at: string;
  status: VaultApyHistoryStatus;
  apy: string | null;
  unavailable_reason: string | null;
}

export interface VaultApyHistoryPeriod {
  status: VaultApyHistoryStatus;
  start_timestamp: string;
  end_timestamp: string;
  average_apy: string | null;
  realized_period_apy: string | null;
  previous_start_timestamp: string;
  previous_end_timestamp: string;
  previous_average_apy: string | null;
  absolute_change: string | null;
  relative_change: string | null;
  direction: VaultApyHistoryDirection | null;
  unavailable_reason: string | null;
}

export interface VaultApyHistoryPeriods {
  '7d': VaultApyHistoryPeriod;
  '30d': VaultApyHistoryPeriod;
  '90d': VaultApyHistoryPeriod;
  '180d': VaultApyHistoryPeriod;
}

export interface VaultApyHistoryVault {
  vault_key: string;
  vault_address: string;
  daily_apy: VaultApyHistoryDailyPoint[];
  periods: VaultApyHistoryPeriods;
}

export interface VaultApyHistoryResponse {
  chain_id: number;
  vaults: VaultApyHistoryVault[];
}
