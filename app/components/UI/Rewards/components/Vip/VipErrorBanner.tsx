import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';

interface VipErrorBannerProps {
  onRetry: () => void;
  testID?: string;
}

const VipErrorBanner: React.FC<VipErrorBannerProps> = ({ onRetry, testID }) => (
  <RewardsErrorBanner
    title={strings('rewards.vip.error_title')}
    description={strings('rewards.vip.error_description')}
    onConfirm={onRetry}
    confirmButtonLabel={strings('rewards.vip.retry_button')}
    testID={testID}
  />
);

export default VipErrorBanner;
