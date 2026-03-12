import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import {
  Button,
  ButtonVariant,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import createStyles from './SpendingLimitWarning.styles';

interface SpendingLimitWarningProps {
  onDismiss: () => void;
}

const SpendingLimitWarning: React.FC<SpendingLimitWarningProps> = ({
  onDismiss,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();

  const handleSetNewLimit = () => {
    navigation.navigate('CardSpendingLimit' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.warningIcon}>
          <Icon
            name={IconName.Warning}
            size={IconSize.Lg}
            color={theme.colors.warning.default}
          />
        </View>

        <View style={styles.textContent}>
          <Text
            variant={TextVariant.BodyLg}
            fontWeight={FontWeight.Bold}
            style={styles.mainText}
          >
            {strings('card.card_home.warnings.close_spending_limit.title')}
          </Text>
          <Text color={TextColor.TextAlternative}>
            {strings(
              'card.card_home.warnings.close_spending_limit.description',
            )}
          </Text>
        </View>
      </View>

      <View style={styles.buttonsRow}>
        <Button variant={ButtonVariant.Secondary} onPress={onDismiss}>
          {strings(
            'card.card_home.warnings.close_spending_limit.dismiss_button_label',
          )}
        </Button>
        <Button variant={ButtonVariant.Primary} onPress={handleSetNewLimit}>
          {strings(
            'card.card_home.warnings.close_spending_limit.confirm_button_label',
          )}
        </Button>
      </View>
    </View>
  );
};

export default SpendingLimitWarning;
