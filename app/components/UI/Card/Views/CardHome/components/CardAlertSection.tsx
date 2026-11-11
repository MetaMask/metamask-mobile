import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CardMessageBoxType, type CardProvisioningView } from '../../../types';
import CardMessageBox from '../../../components/CardMessageBox/CardMessageBox';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import type { CardAlert } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface CardAlertSectionProps {
  alerts: CardAlert[];
  onNavigateToSpendingLimit: () => void;
  onDismissSpendingLimitWarning?: () => void;
  provisioningView?: CardProvisioningView;
}

const CardAlertSection = ({
  alerts,
  onNavigateToSpendingLimit,
  onDismissSpendingLimitWarning,
  provisioningView = 'provisioning',
}: CardAlertSectionProps) => {
  const tw = useTailwind();

  return (
    <>
      {alerts.map((cardAlert, index) => {
        switch (cardAlert.type) {
          case 'close_to_spending_limit':
            return (
              <CardMessageBox
                key={`${cardAlert.type}-${index}`}
                messageType={CardMessageBoxType.CloseSpendingLimit}
                onConfirm={onNavigateToSpendingLimit}
                onDismiss={onDismissSpendingLimitWarning}
              />
            );
          case 'kyc_pending':
            return (
              <CardMessageBox
                key={`${cardAlert.type}-${index}`}
                messageType={CardMessageBoxType.KYCPending}
              />
            );
          case 'allowance_revoked':
            // Covered by the shared Enable card button — no banner.
            return null;
          case 'card_provisioning':
            if (provisioningView === 'reconciling') {
              return (
                <Skeleton
                  key={`${cardAlert.type}-${index}`}
                  height={88}
                  width="100%"
                  style={tw.style('rounded-xl')}
                  testID="card-provisioning-alert-skeleton"
                />
              );
            }
            if (provisioningView === 'hidden') {
              return null;
            }
            if (provisioningView === 'kyc_under_review') {
              return (
                <CardMessageBox
                  key={`${cardAlert.type}-${index}`}
                  messageType={CardMessageBoxType.KYCPending}
                />
              );
            }
            return (
              <CardMessageBox
                key={`${cardAlert.type}-${index}`}
                messageType={CardMessageBoxType.CardProvisioning}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
};

export default CardAlertSection;
