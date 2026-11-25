import React from 'react';
import {
  BannerBase,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface IdentityVerifiedBannerProps {
  onDismiss: () => void;
}

/**
 * Kalshi confirmed the identity. The only affordance is the close button; the
 * card itself is not a press target.
 */
export const IdentityVerifiedBanner = ({
  onDismiss,
}: IdentityVerifiedBannerProps) => (
  <BannerBase
    backgroundColor={BoxBackgroundColor.BackgroundSection}
    closeButtonProps={{
      accessibilityLabel: strings(
        'predict_next.account_readiness.verified.dismiss',
      ),
      testID: PredictHomeTestIds.IDENTITY_VERIFIED_DISMISS,
    }}
    description={strings('predict_next.account_readiness.verified.body')}
    onClose={onDismiss}
    testID={PredictHomeTestIds.IDENTITY_VERIFIED_BANNER}
    title={strings('predict_next.account_readiness.verified.title')}
    titleProps={{ accessibilityRole: 'header' }}
  />
);
