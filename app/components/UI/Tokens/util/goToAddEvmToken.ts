import {
  AnalyticsEventBuilder,
  type AnalyticsTrackingEvent,
} from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

interface GoToAddEvmTokenProps {
  navigation: AppNavigationProp;
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
  navigation.navigate('AddAsset', { assetType: 'token' });

  trackEvent(
    createEventBuilder(MetaMetricsEvents.TOKEN_IMPORT_CLICKED)
      .addProperties({
        source: 'manual',
        chain_id: getDecimalChainId(currentChainId),
      })
      .build(),
  );
};
