import React from 'react';
import { TouchableOpacity, View, ActivityIndicator } from 'react-native';

import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';

import styleSheet from './PaymentMethodPill.styles';

export interface PaymentMethodPillProps {
  /** Payment method label (e.g., "Debit card") */
  label: string;
  /** Optional press handler */
  onPress?: () => void;
  /** When true, shows loading indicator instead of carat and disables press */
  isLoading?: boolean;
  /** Test ID for testing */
  testID?: string;
}

const PaymentMethodPill: React.FC<PaymentMethodPillProps> = ({
  label,
  onPress,
  isLoading = false,
  testID = 'payment-method-pill',
}) => {
  const { styles } = useStyles(styleSheet);
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]} testID={testID}>
        <ActivityIndicator size="small" color={colors.icon.inverse} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <Icon
          name={IconName.Card}
          size={IconSize.Sm}
          color={IconColor.Default}
        />
      </View>
      <Text variant={TextVariant.BodyMDMedium} style={styles.label}>
        {label}
      </Text>
      <View style={styles.arrowWrapper}>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.Default}
        />
      </View>
    </TouchableOpacity>
  );
};

export default PaymentMethodPill;
