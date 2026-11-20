import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';

export interface MoneyVaultCompositionMarketsTableProps {
  allocationLabel: string;
  components: VaultCompositionResponse['components'];
  incentiveAprLabel: string;
  marketLabel: string;
  networkLabel: string;
  supplyApyLabel: string;
}
