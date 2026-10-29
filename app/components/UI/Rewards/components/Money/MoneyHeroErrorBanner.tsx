import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';

export interface MoneyHeroErrorBannerProps {
  onRetry: () => void;
  isRetrying: boolean;
  testID: string;
}

/**
 * The hero's refresh failure. Shown only when the failed entry has no cached
 * data; the card decides that before rendering this.
 */
const MoneyHeroErrorBanner: React.FC<MoneyHeroErrorBannerProps> = ({
  onRetry,
  isRetrying,
  testID,
}) => (
  <RewardsErrorBanner
    title={strings('rewards.referral_details_error.error_fetching_title')}
    description={strings(
      'rewards.referral_details_error.error_fetching_description',
    )}
    onConfirm={onRetry}
    confirmButtonLabel={strings('rewards.referral_details_error.retry_button')}
    onConfirmLoading={isRetrying}
    testID={testID}
  />
);

export default MoneyHeroErrorBanner;
