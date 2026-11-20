import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';

export interface MoneyVaultCompositionMarketsTableProps {
  allocationLabel: string;
  apyLabel: string;
  components: VaultCompositionResponse['components'];
  marketLabel: string;
  networkLabel: string;
}
