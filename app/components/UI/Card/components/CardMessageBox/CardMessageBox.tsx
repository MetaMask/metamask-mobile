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
import { FLAT_BANNER_ALERT_STYLE } from '../../../shared/flatBannerAlertStyle';

interface CardMessageBoxProps {
  messageType: CardMessageBoxType;
  onConfirm?: () => void;
  onConfirmLoading?: boolean;
  onDismiss?: () => void;
  values?: Record<string, string | number>;
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
  values,
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
      [CardMessageBoxType.Blocked]: {
        variant: CardMessageBoxVariant.Warning,
        title: strings('card.card_home.warnings.blocked.title'),
        description: strings('card.card_home.warnings.blocked.description'),
      },
      [CardMessageBoxType.CardProvisioning]: {
        variant: CardMessageBoxVariant.Info,
        title: strings('card.card_home.messages.card_provisioning.title'),
        description: strings(
          'card.card_home.messages.card_provisioning.description',
        ),
      },
      [CardMessageBoxType.PendingVerification]: {
        variant: CardMessageBoxVariant.Warning,
        title: strings('card.card_home.warnings.pending_verification.title'),
        description: strings(
          'card.card_home.warnings.pending_verification.description',
        ),
        confirmButtonLabel: strings(
          'card.card_home.warnings.pending_verification.confirm_button_label',
        ),
      },
      [CardMessageBoxType.AuthPrompt]: {
        variant: CardMessageBoxVariant.Info,
        title: strings('card.card_authentication.auth_prompt_info'),
      },
      [CardMessageBoxType.CashbackFundingRequired]: {
        variant: CardMessageBoxVariant.Warning,
        title: strings('card.cashback_screen.funding_required.title'),
        description: strings(
          'card.cashback_screen.funding_required.description',
        ),
        confirmButtonLabel: strings(
          'card.cashback_screen.funding_required.confirm_button_label',
        ),
      },
      [CardMessageBoxType.CashbackMoneyAccountRequired]: {
        variant: CardMessageBoxVariant.Warning,
        title: strings('card.cashback_screen.money_account_required.title'),
        description: strings(
          'card.cashback_screen.money_account_required.description',
        ),
        confirmButtonLabel: strings(
          'card.cashback_screen.money_account_required.confirm_button_label',
        ),
      },
      [CardMessageBoxType.CreditFundingRequired]: {
        variant: CardMessageBoxVariant.Warning,
        title: strings('card.credit_screen.funding_required.title'),
        description: strings('card.credit_screen.funding_required.description'),
        confirmButtonLabel: strings(
          'card.credit_screen.funding_required.confirm_button_label',
        ),
      },
      [CardMessageBoxType.CreditMoneyAccountRequired]: {
        variant: CardMessageBoxVariant.Warning,
        title: strings('card.credit_screen.money_account_required.title'),
        description: strings(
          'card.credit_screen.money_account_required.description',
        ),
        confirmButtonLabel: strings(
          'card.credit_screen.money_account_required.confirm_button_label',
        ),
      },
      [CardMessageBoxType.CreditAvailable]: {
        variant: CardMessageBoxVariant.Info,
        title: strings('card.credit_banner.title', values),
        description: strings('card.credit_banner.description'),
        confirmButtonLabel: strings('card.credit_banner.confirm_button_label'),
      },
      [CardMessageBoxType.CreditAvailableNoMoneyAccount]: {
        variant: CardMessageBoxVariant.Info,
        title: strings('card.credit_banner.title', values),
        description: strings('card.credit_banner.description_no_money_account'),
        confirmButtonLabel: strings('card.credit_banner.confirm_button_label'),
      },
    }),
    [values],
  );

  const config = messageConfigs[messageType];

  return (
    <BannerAlert
      severity={SEVERITY_MAP[config.variant]}
      title={config.title}
      description={config.description}
      style={FLAT_BANNER_ALERT_STYLE}
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
