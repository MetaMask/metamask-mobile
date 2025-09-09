import { RouteProp } from '@react-navigation/native';
import { IconName } from '@metamask/design-system-react-native';
import { TraceName } from '../../../util/trace';
import { IMetaMetricsEvent } from '../../../core/Analytics';

export interface FundActionMenuParams {
  onBuy?: () => void;
  asset?: {
    address?: string;
    chainId?: string;
  };
}

export interface ActionConfig {
  type: 'deposit' | 'buy' | 'sell';
  label: string;
  description: string;
  iconName: IconName;
  testID: string;
  isVisible: boolean;
  isDisabled?: boolean;
  analyticsEvent: IMetaMetricsEvent;
  analyticsProperties: Record<string, string | number>;
  traceName: TraceName;
  traceProperties?: Record<
    string,
    string | number | boolean | Record<string, string | number | boolean>
  >;
  navigationAction: () => void;
}
