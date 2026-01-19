import { RouteProp } from '@react-navigation/native';
import { IconName } from '@metamask/design-system-react-native';
import { TraceName } from '../../../util/trace';
import { IMetaMetricsEvent } from '../../../core/Analytics';

export interface FundActionMenuParams {
  onBuy?: () => void;
  asset?: {
    assetId?: string;
    address?: string;
    chainId?: string;
  };
}

export type FundActionMenuRouteProp = RouteProp<
  { FundActionMenu: FundActionMenuParams },
  'FundActionMenu'
>;

export interface ActionConfig {
  type: 'deposit' | 'buy' | 'sell' | 'buy-unified';
  label: string;
  description: string;
  iconName: IconName;
  testID: string;
  isVisible: boolean;
  isDisabled?: boolean;
  analyticsEvent: IMetaMetricsEvent;
  analyticsProperties: Record<string, string | number | boolean | undefined>;
  traceName: TraceName;
  traceProperties?: Record<
    string,
    string | number | boolean | Record<string, string | number | boolean>
  >;
  navigationAction: () => void;
}
