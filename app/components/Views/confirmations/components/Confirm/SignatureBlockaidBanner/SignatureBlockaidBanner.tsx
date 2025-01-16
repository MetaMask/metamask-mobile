import React, { useCallback } from 'react';

import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { getAnalyticsParams } from '../../../../../../util/confirmation/signatureUtils';
import { useStyles } from '../../../../../../component-library/hooks';
import { useMetrics } from '../../../../../hooks/useMetrics';
import BlockaidBanner from '../../../components/BlockaidBanner/BlockaidBanner';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useSignatureRequest } from '../../../hooks/useSignatureRequest';
import { getSignatureDecodingEventProps } from '../../../utils/signatureMetrics';
import styleSheet from './SignatureBlockaidBanner.styles';
import { useTypedSignSimulationEnabled } from '../../../hooks/useTypedSignSimulationEnabled';

const SignatureBlockaidBanner = () => {
  const { approvalRequest } = useApprovalRequest();
  const signatureRequest = useSignatureRequest();
  const isSimulationEnabled = useTypedSignSimulationEnabled();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { styles } = useStyles(styleSheet, {});

  const {
    type,
    messageParams: { from: fromAddress },
  } = signatureRequest ?? {
    messageParams: {},
  };

  const onContactUsClicked = useCallback(() => {
    const eventProps = {
      ...getAnalyticsParams(
        {
          from: fromAddress,
        },
        type,
      ),
      ...getSignatureDecodingEventProps(signatureRequest, isSimulationEnabled),
      external_link_clicked: 'security_alert_support_link',
    };

    trackEvent(
      createEventBuilder(MetaMetricsEvents.SIGNATURE_REQUESTED)
        .addProperties(eventProps)
        .build(),
    );
  }, [trackEvent, createEventBuilder, signatureRequest, type, fromAddress, isSimulationEnabled]);

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
