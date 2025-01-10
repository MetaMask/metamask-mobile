import React, { useCallback } from 'react';

import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { getAnalyticsParams } from '../../../../../../util/confirmation/signatureUtils';
import { useStyles } from '../../../../../../component-library/hooks';
import { useMetrics } from '../../../../../hooks/useMetrics';
import BlockaidBanner from '../../../components/BlockaidBanner/BlockaidBanner';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import styleSheet from './SignatureBlockaidBanner.styles';

const SignatureBlockaidBanner = () => {
  const { approvalRequest } = useApprovalRequest();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { styles } = useStyles(styleSheet, {});

  const {
    type,
    requestData: { from: fromAddress },
  } = approvalRequest ?? {
    requestData: {},
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

  if (!approvalRequest?.requestData?.securityAlertResponse) {
    return null;
  }

  return (
    <BlockaidBanner
      onContactUsClicked={onContactUsClicked}
      securityAlertResponse={
        approvalRequest?.requestData?.securityAlertResponse
      }
      style={styles.blockaidBanner}
    />
  );
};

export default SignatureBlockaidBanner;
