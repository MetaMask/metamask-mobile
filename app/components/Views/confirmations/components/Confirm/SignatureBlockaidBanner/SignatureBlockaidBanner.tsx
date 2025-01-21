import React, { useCallback } from 'react';

import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { getAnalyticsParams } from '../../../../../../util/confirmation/signatureUtils';
import { useStyles } from '../../../../../../component-library/hooks';
import { useMetrics } from '../../../../../hooks/useMetrics';
import BlockaidBanner from '../../../components/BlockaidBanner/BlockaidBanner';
import { SecurityAlertResponse } from '../../BlockaidBanner/BlockaidBanner.types';
import styleSheet from './SignatureBlockaidBanner.styles';
import { useSignatureRequest } from '../../../hooks/useSignatureRequest';

const SignatureBlockaidBanner = () => {
  const signatureRequest = useSignatureRequest();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { styles } = useStyles(styleSheet, {});

  const {
    type,
    messageParams: { from: fromAddress },
  } = signatureRequest ?? {
    messageParams: {},
  };

  const onContactUsClicked = useCallback(() => {
    const analyticsParams = {
      ...getAnalyticsParams(
        {
          from: fromAddress,
        },
        type,
      ),
      external_link_clicked: 'security_alert_support_link',
    };
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SIGNATURE_REQUESTED)
        .addProperties(analyticsParams)
        .build(),
    );
  }, [trackEvent, createEventBuilder, type, fromAddress]);

  if (!signatureRequest?.securityAlertResponse) {
    return null;
  }

  return (
    <BlockaidBanner
      onContactUsClicked={onContactUsClicked}
      securityAlertResponse={
        signatureRequest?.securityAlertResponse as SecurityAlertResponse
      }
      style={styles.blockaidBanner}
    />
  );
};

export default SignatureBlockaidBanner;
