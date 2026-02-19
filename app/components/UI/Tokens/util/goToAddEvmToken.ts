import { StackNavigationProp } from '@react-navigation/stack';
import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../core/Analytics';

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface GoToAddEvmTokenProps {
  navigation: StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>;
  trackEvent: (
    event: AnalyticsTrackingEvent,
    saveDataRecording?: boolean,
  ) => void;
  createEventBuilder: typeof AnalyticsEventBuilder.createEventBuilder;
  getDecimalChainId: (chainId: string) => number;
  currentChainId: string;
}

export const goToAddEvmToken = ({
  navigation,
  trackEvent,
  createEventBuilder,
  getDecimalChainId,
  currentChainId,
}: GoToAddEvmTokenProps) => {
  navigation.push('AddAsset', { assetType: 'token' });

  trackEvent(
    createEventBuilder(MetaMetricsEvents.TOKEN_IMPORT_CLICKED)
      .addProperties({
        source: 'manual',
        chain_id: getDecimalChainId(currentChainId),
      })
      .build(),
  );
};
