import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
  FontWeight,
  Spinner,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';

import styleSheet from './PaymentMethodPill.styles';
import { PAYMENT_METHOD_PILL_TEST_IDS } from './PaymentMethodPill.testIds';

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
  testID = PAYMENT_METHOD_PILL_TEST_IDS.CONTAINER,
}) => {
  const { styles } = useStyles(styleSheet, {});

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]} testID={testID}>
        <Spinner
          color={IconColor.IconDefault}
          spinnerIconProps={{ size: IconSize.Sm }}
        />
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
          color={IconColor.IconDefault}
        />
      </View>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        style={styles.label}
      >
        {label}
      </Text>
      <View style={styles.arrowWrapper}>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.IconDefault}
        />
      </View>
    </TouchableOpacity>
  );
};

export default PaymentMethodPill;
