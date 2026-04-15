import React, { useMemo } from 'react';
import {
  BannerAlert,
  Box,
  BoxFlexDirection,
  BannerAlertSeverity,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { CardMessageBoxType, CardMessageBoxVariant } from '../../types';
import { strings } from '../../../../../../locales/i18n';

interface CardMessageBoxProps {
  messageType: CardMessageBoxType;
  onConfirm?: () => void;
  onConfirmLoading?: boolean;
  onDismiss?: () => void;
}

interface MessageConfig {
  variant: CardMessageBoxVariant;
  title: string;
  description?: string;
  confirmButtonLabel?: string;
}

const SEVERITY_MAP: Record<CardMessageBoxVariant, BannerAlertSeverity> = {
  [CardMessageBoxVariant.Warning]: BannerAlertSeverity.Warning,
  [CardMessageBoxVariant.Info]: BannerAlertSeverity.Info,
};

const CardMessageBox = ({
  messageType,
  onConfirm,
  onConfirmLoading,
  onDismiss,
}: CardMessageBoxProps) => {
  const messageConfigs: Record<CardMessageBoxType, MessageConfig> = useMemo(
    () => ({
      [CardMessageBoxType.CloseSpendingLimit]: {
        variant: CardMessageBoxVariant.Warning,
        title: strings('card.card_home.warnings.close_spending_limit.title'),
        description: strings(
          'card.card_home.warnings.close_spending_limit.description',
        ),
        confirmButtonLabel: strings(
          'card.card_home.warnings.close_spending_limit.confirm_button_label',
        ),
      },
      [CardMessageBoxType.KYCPending]: {
        variant: CardMessageBoxVariant.Warning,
        title: strings('card.card_home.warnings.kyc_pending.title'),
        description: strings('card.card_home.warnings.kyc_pending.description'),
      },
      [CardMessageBoxType.CardProvisioning]: {
        variant: CardMessageBoxVariant.Info,
        title: strings('card.card_home.messages.card_provisioning.title'),
        description: strings(
          'card.card_home.messages.card_provisioning.description',
        ),
      },
      [CardMessageBoxType.AuthPrompt]: {
        variant: CardMessageBoxVariant.Info,
        title: strings('card.card_authentication.auth_prompt_info'),
      },
    }),
    [],
  );

  const config = messageConfigs[messageType];

  return (
    <BannerAlert
      severity={SEVERITY_MAP[config.variant]}
      title={config.title}
      description={config.description}
      testID="card-message-box"
    >
      {(onConfirm || onDismiss) && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          gap={2}
          twClassName="mt-4"
          testID="card-message-box-actions"
        >
          {onDismiss && (
            <Button
              variant={ButtonVariant.Secondary}
              onPress={onDismiss}
              testID="dismiss-button"
            >
              {strings('card.card_spending_limit.dismiss')}
            </Button>
          )}
          {config.confirmButtonLabel && onConfirm ? (
            <Button
              variant={ButtonVariant.Primary}
              onPress={onConfirm}
              isLoading={onConfirmLoading}
              testID="confirm-button"
            >
              {config.confirmButtonLabel}
            </Button>
          ) : null}
        </Box>
      )}
    </BannerAlert>
  );
};

export default CardMessageBox;
