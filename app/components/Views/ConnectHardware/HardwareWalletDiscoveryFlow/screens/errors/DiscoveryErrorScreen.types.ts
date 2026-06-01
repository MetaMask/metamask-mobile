import type { ImageSourcePropType } from 'react-native';

export interface DiscoveryErrorButtonConfig {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface DiscoveryErrorScreenLayoutProps {
  imageSource?: ImageSourcePropType;
  artboardName?: string;
  stateMachineName?: string;
  stateTrigger?: string;
  title: string;
  subtitle: string;
  primaryButton?: DiscoveryErrorButtonConfig;
  secondaryButton?: DiscoveryErrorButtonConfig;
  testID?: string;
}

export interface DiscoveryErrorScreenActionProps {
  onRetry?: () => void;
  onNotNow?: () => void;
  onContinue?: () => void;
}
