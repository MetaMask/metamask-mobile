import { PooledStakingState } from '@metamask/earn-controller';
import {
  VaultData,
  VaultApyAverages,
  VaultDailyApy,
} from '@metamask/stake-sdk';

export interface MockEarnControllerOptions {
  isEligible?: boolean;
  pooledStakes?: PooledStakingState['pooledStakes'];
  vaultMetadata?: VaultData;
  exchangeRate?: string;
  vaultApyAverages?: VaultApyAverages;
  vaultDailyApys?: VaultDailyApy[];
}
