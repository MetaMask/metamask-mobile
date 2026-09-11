import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CardMessageBoxType } from '../../../types';
import CardMessageBox from '../../../components/CardMessageBox/CardMessageBox';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import type { CardAlert } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface CardAlertSectionProps {
  alerts: CardAlert[];
  onNavigateToSpendingLimit: () => void;
  onDismissSpendingLimitWarning?: () => void;
  hasPendingVerification?: boolean;
  onContinueVerification?: () => void;
  isReconcilingProvisioning?: boolean;
}

const CardAlertSection = ({
  alerts,
  onNavigateToSpendingLimit,
  onDismissSpendingLimitWarning,
  hasPendingVerification,
  onContinueVerification,
  isReconcilingProvisioning,
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
          case 'card_provisioning':
            if (isReconcilingProvisioning) {
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
            return hasPendingVerification ? (
              <CardMessageBox
                key={`${cardAlert.type}-${index}`}
                messageType={CardMessageBoxType.PendingVerification}
                onConfirm={onContinueVerification}
              />
            ) : (
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
