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
import { CardWarningBoxType } from '../../types';
import { strings } from '../../../../../../locales/i18n';

interface CardWarningBoxProps {
  warning: CardWarningBoxType;
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
    CardWarningBoxType,
    { title: string; description: string; confirmButtonLabel?: string }
  > = {
    [CardWarningBoxType.CloseSpendingLimit]: {
      title: strings('card.card_home.warnings.close_spending_limit.title'),
      description: strings(
        'card.card_home.warnings.close_spending_limit.description',
      ),
      confirmButtonLabel: strings(
        'card.card_home.warnings.close_spending_limit.confirm_button_label',
      ),
    },
    [CardWarningBoxType.KYCPending]: {
      title: strings('card.card_home.warnings.kyc_pending.title'),
      description: strings('card.card_home.warnings.kyc_pending.description'),
    },
  };

  const warningConfig = warningTexts[warning];

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
          <Text variant={TextVariant.BodyMDBold}>{warningConfig.title}</Text>
          <Text variant={TextVariant.BodyMD}>{warningConfig.description}</Text>
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
          {warningConfig.confirmButtonLabel && onConfirm ? (
            <Button
              variant={ButtonVariants.Primary}
              onPress={onConfirm}
              loading={onConfirmLoading}
              label={warningConfig.confirmButtonLabel}
              testID="confirm-button"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default CardWarningBox;
