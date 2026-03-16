import React from 'react';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

interface PaymentSelectionAlertProps {
  message: string;
  severity?: BannerAlertSeverity;
}

const PaymentSelectionAlert: React.FC<PaymentSelectionAlertProps> = ({
  message,
  severity = BannerAlertSeverity.Error,
}) => (
  <BannerAlert
    description={<Text variant={TextVariant.BodySM}>{message}</Text>}
    severity={severity}
  />
);

export default PaymentSelectionAlert;
