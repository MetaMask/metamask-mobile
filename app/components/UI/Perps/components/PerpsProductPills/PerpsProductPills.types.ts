import { type MarketTypeFilter } from '@metamask/perps-controller';
import { type IconName } from '@metamask/design-system-react-native';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export interface ProductPillConfig {
  category: Exclude<MarketTypeFilter, 'all'>;
  labelKey: string;
  icon: IconName;
}

export interface PerpsProductPillsProps {
  source?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  testID?: string;
}
