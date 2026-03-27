import React, { useMemo } from 'react';
import { View } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import createStyles from './CardMessageBox.styles';
import { CardMessageBoxType, CardMessageBoxVariant } from '../../types';
import { strings } from '../../../../../../locales/i18n';

interface CardMessageBoxProps {
  messageType: CardMessageBoxType;
  onConfirm?: () => void;
  onConfirmLoading?: boolean;
  onDismiss?: () => void;
}

/**
 * Configuration for each message type including variant, title, description, and optional confirm button
 */
interface MessageConfig {
  variant: CardMessageBoxVariant;
  title: string;
  description: string;
  confirmButtonLabel?: string;
}

const CardMessageBox = ({
  messageType,
  onConfirm,
  onConfirmLoading,
  onDismiss,
}: CardMessageBoxProps) => {
  const theme = useTheme();

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
    }),
    [],
  );

  const config = messageConfigs[messageType];
  const styles = createStyles(theme, config.variant);

  const iconName =
    config.variant === CardMessageBoxVariant.Warning
      ? IconName.Danger
      : IconName.Info;

  const iconColor =
    config.variant === CardMessageBoxVariant.Warning
      ? theme.colors.warning.default
      : theme.colors.info.default;

  return (
    <View style={styles.container} testID="card-message-box">
      <Icon
        name={iconName}
        size={IconSize.Xl}
        color={iconColor}
        testID="icon"
      />
      <View style={styles.contentContainer}>
        <View style={styles.textsContainer}>
          <Text variant={TextVariant.BodyMDBold}>{config.title}</Text>
          <Text variant={TextVariant.BodyMD}>{config.description}</Text>
        </View>

        <View
          style={[
            styles.buttonsContainer,
            !(onConfirm || onDismiss) ? styles.isHidden : undefined,
          ]}
        >
          {onDismiss && (
            <Button
              variant={ButtonVariants.Secondary}
              onPress={onDismiss}
              label={strings('card.card_spending_limit.dismiss')}
              testID="dismiss-button"
            />
          )}
          {config.confirmButtonLabel && onConfirm ? (
            <Button
              variant={ButtonVariants.Primary}
              onPress={onConfirm}
              loading={onConfirmLoading}
              label={config.confirmButtonLabel}
              testID="confirm-button"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default CardMessageBox;
