import React from 'react';
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
import createStyles from './CardWarningBox.styles';
import { CardWarning as CardWarningType } from '../../types';
import { strings } from '../../../../../../locales/i18n';

interface CardWarningBoxProps {
  warning: CardWarningType;
  onConfirm?: () => void;
  onConfirmLoading?: boolean;
  onDismiss?: () => void;
}

const CardWarningBox = ({
  warning,
  onConfirm,
  onConfirmLoading,
  onDismiss,
}: CardWarningBoxProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const warningTexts: Record<
    CardWarningType,
    { title: string; description: string; confirmButtonLabel: string }
  > = {
    [CardWarningType.CloseSpendingLimit]: {
      title: strings('card.card_home.warnings.close_spending_limit.title'),
      description: strings(
        'card.card_home.warnings.close_spending_limit.description',
      ),
      confirmButtonLabel: strings(
        'card.card_home.warnings.close_spending_limit.confirm_button_label',
      ),
    },
    [CardWarningType.NeedDelegation]: {
      title: strings('card.card_home.warnings.need_delegation.title'),
      description: strings(
        'card.card_home.warnings.need_delegation.description',
      ),
      confirmButtonLabel: strings(
        'card.card_home.warnings.need_delegation.confirm_button_label',
      ),
    },
  };
  return (
    <View style={styles.container}>
      <Icon
        name={IconName.Danger}
        size={IconSize.Xl}
        color={theme.colors.warning.default}
        testID="icon"
      />
      <View style={styles.contentContainer}>
        <View style={styles.textsContainer}>
          <Text variant={TextVariant.BodyMDBold}>
            {warningTexts[warning].title}
          </Text>
          <Text variant={TextVariant.BodyMD}>
            {warningTexts[warning].description}
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          {onDismiss && (
            <Button
              variant={ButtonVariants.Secondary}
              onPress={onDismiss}
              label="Dismiss"
              testID="dismiss-button"
            />
          )}
          {onConfirm && (
            <Button
              variant={ButtonVariants.Primary}
              onPress={onConfirm}
              loading={onConfirmLoading}
              label={warningTexts[warning].confirmButtonLabel}
              testID="confirm-button"
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default CardWarningBox;
