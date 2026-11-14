import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';

interface PaymentSelectionAlertProps {
  message: string;
  severity?: BannerAlertSeverity;
}

const PaymentSelectionAlert: React.FC<PaymentSelectionAlertProps> = ({
  message,
  severity = BannerAlertSeverity.Danger,
}) => <BannerAlert description={message} severity={severity} />;

export default PaymentSelectionAlert;
