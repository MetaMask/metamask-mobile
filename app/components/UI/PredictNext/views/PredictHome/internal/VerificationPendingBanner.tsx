import React from 'react';
import {
  BannerBase,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import { PredictHomeTestIds } from '../PredictHome.testIds';

/**
 * A static account status: Kalshi is reviewing the identity. There is no tap,
 * no close and no action, and the card survives a read timeout.
 */
export const VerificationPendingBanner = () => (
  <BannerBase
    backgroundColor={BoxBackgroundColor.BackgroundSection}
    description={strings('predict_next.account_readiness.verifying.body')}
    testID={PredictHomeTestIds.VERIFICATION_PENDING_BANNER}
    title={strings('predict_next.account_readiness.verifying.title')}
    titleProps={{ accessibilityRole: 'header' }}
  />
);
