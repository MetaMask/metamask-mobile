import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';

export interface MoneyVaultCompositionMarketsTableProps {
  allocationLabel: string;
  components: VaultCompositionResponse['components'];
  apyLabel: string;
  marketLabel: string;
  networkLabel: string;
}
