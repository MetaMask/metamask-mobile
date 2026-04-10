import React from 'react';
import { CardMessageBoxType } from '../../../types';
import CardMessageBox from '../../../components/CardMessageBox/CardMessageBox';
import type { CardAlert } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface CardAlertSectionProps {
  alerts: CardAlert[];
  onNavigateToSpendingLimit: () => void;
  onDismissSpendingLimitWarning?: () => void;
}

const CardAlertSection = ({
  alerts,
  onNavigateToSpendingLimit,
  onDismissSpendingLimitWarning,
}: CardAlertSectionProps) => (
  <>
    {alerts.map((cardAlert) => {
      switch (cardAlert.type) {
        case 'close_to_spending_limit':
          return (
            <CardMessageBox
              key={cardAlert.type}
              messageType={CardMessageBoxType.CloseSpendingLimit}
              onConfirm={onNavigateToSpendingLimit}
              onDismiss={onDismissSpendingLimitWarning}
            />
          );
        case 'kyc_pending':
          return (
            <CardMessageBox
              key={cardAlert.type}
              messageType={CardMessageBoxType.KYCPending}
            />
          );
        case 'card_provisioning':
          return (
            <CardMessageBox
              key={cardAlert.type}
              messageType={CardMessageBoxType.CardProvisioning}
            />
          );
        default:
          return null;
      }
    })}
  </>
);

export default CardAlertSection;
