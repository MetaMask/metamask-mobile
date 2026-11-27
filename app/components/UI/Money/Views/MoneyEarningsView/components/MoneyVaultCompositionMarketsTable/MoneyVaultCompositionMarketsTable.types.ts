import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';

export interface MoneyVaultCompositionMarketsTableProps {
  allocationLabel: string;
  components: VaultCompositionResponse['components'];
  apyLabel: string;
  isLoading?: boolean;
  marketLabel: string;
  networkLabel: string;
}
