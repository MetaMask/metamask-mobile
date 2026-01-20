import React from 'react';
import { useAlerts } from '../../context/alert-system-context';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import styleSheet from './alert-banner.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { getBannerAlertSeverity } from '../../utils/alert-system';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { AlertKeys } from '../../constants/alerts';
import { hasTransactionType } from '../../utils/transaction';
export interface AlertBannerProps {
  blockingOnly?: boolean;
  excludeKeys?: AlertKeys[];
  ignoreTypes?: TransactionType[];
  includeFields?: boolean;
  inline?: boolean;
}

const AlertBanner = ({
  blockingOnly,
  excludeKeys,
  ignoreTypes,
  includeFields,
  inline,
}: AlertBannerProps = {}) => {
  const { generalAlerts, fieldAlerts } = useAlerts();
  const { styles } = useStyles(styleSheet, { inline });
  const transaction = useTransactionMetadataRequest();

  let alerts = [...generalAlerts];

  if (includeFields) {
    alerts.push(...fieldAlerts);
  }

  if (blockingOnly) {
    alerts = alerts.filter((a) => a.isBlocking);
  }

  if (excludeKeys) {
    alerts = alerts.filter((a) => !excludeKeys.includes(a.key as AlertKeys));
  }

  if (
    alerts.length === 0 ||
    hasTransactionType(transaction, ignoreTypes ?? [])
  ) {
    return null;
  }

  // Temporary loop throw all general alerts until design team establishes a design for multiple general alerts
  return (
    <>
      {alerts.map((selectedAlert, index) => (
        <BannerAlert
          key={`banner-alert-${index}`}
          severity={getBannerAlertSeverity(selectedAlert.severity)}
          title={selectedAlert.title}
          description={selectedAlert.content ?? selectedAlert.message}
          style={styles.wrapper}
          testID={`security-alert-banner-${index}`}
        />
      ))}
    </>
  );
};

export default AlertBanner;
