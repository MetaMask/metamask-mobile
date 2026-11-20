import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';

export interface MoneyMarketExposureRowProps {
  protocol: VaultCompositionResponse['protocols'][number];
}
