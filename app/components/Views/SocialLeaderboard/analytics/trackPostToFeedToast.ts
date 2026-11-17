import { MetaMetricsEvents } from '../../../../core/Analytics';
import { store } from '../../../../store';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { withSocialAppBuild } from './socialAppBuild';
import {
  SocialEvent,
  type SocialComposerEntry,
  type SocialEventSource,
} from './socialEvents';

/**
 * "Post to feed" toast tap. The toast is built outside React, so this uses
 * the non-React analytics helper.
 */
export const trackPostToFeedToast = ({
  composerEntry,
  source,
  shareId,
  orderId,
  transactionHash,
}: {
  composerEntry: SocialComposerEntry;
  source?: SocialEventSource;
  shareId: string;
  orderId?: string;
  transactionHash?: string;
}): void => {
  // A toast tap still opens the composer when the flag state is unavailable.
  let socialEnabled = false;
  try {
    socialEnabled = selectIsSocialV1Enabled(store.getState());
  } catch {
    socialEnabled = false;
  }
  if (!socialEnabled) {
    return;
  }
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.SOCIAL_UI_INTERACTION,
    )
      .addProperties(
        withSocialAppBuild({
          interaction_type: SocialEvent.Interaction.TAP,
          screen_name: SocialEvent.Screen.POST_TO_FEED_TOAST,
          composer_entry: composerEntry,
          share_id: shareId,
          ...(source ? { source } : {}),
          ...(orderId ? { order_id: orderId } : {}),
          ...(transactionHash ? { transaction_hash: transactionHash } : {}),
        }),
      )
      .build(),
  );
};
