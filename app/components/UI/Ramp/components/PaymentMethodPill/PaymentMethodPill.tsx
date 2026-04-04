import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import type { PaymentMethod } from '@metamask/ramps-controller';
import type { PaymentType } from '@consensys/on-ramp-sdk';
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
import { useTheme } from '../../../../../util/theme';

import PaymentMethodIcon from '../../Aggregator/components/PaymentMethodIcon';
import styleSheet from './PaymentMethodPill.styles';
import { PAYMENT_METHOD_PILL_TEST_IDS } from './PaymentMethodPill.testIds';

const PAYMENT_METHOD_ICON_SIZE = 16;

export type PaymentMethodForPill = Pick<PaymentMethod, 'paymentType'>;

export interface PaymentMethodPillProps {
  /** Payment method label (e.g., "Debit card") */
  label: string;
  /** Optional press handler */
  onPress?: () => void;
  /** When true, shows loading indicator instead of carat and disables press */
  isLoading?: boolean;
  /** Test ID for testing */
  testID?: string;
  /** Selected method: same `PaymentMethodIcon` + `paymentType` as the payment list; icon uses default color (not primary—modal only uses primary for the selected row). */
  paymentMethod?: PaymentMethodForPill | null;
}

const PaymentMethodPill: React.FC<PaymentMethodPillProps> = ({
  label,
  onPress,
  isLoading = false,
  testID = PAYMENT_METHOD_PILL_TEST_IDS.CONTAINER,
  paymentMethod,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();

  const paymentType = paymentMethod?.paymentType;
  const hasPaymentType = paymentType != null && String(paymentType).length > 0;

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
        {hasPaymentType ? (
          <PaymentMethodIcon
            paymentMethodType={paymentType as PaymentType}
            size={PAYMENT_METHOD_ICON_SIZE}
            color={colors.icon.default}
          />
        ) : (
          <Icon
            name={IconName.Card}
            size={IconSize.Sm}
            color={IconColor.IconDefault}
          />
        )}
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
