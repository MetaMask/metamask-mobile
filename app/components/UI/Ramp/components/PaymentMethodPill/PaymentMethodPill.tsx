import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import type { PaymentMethod } from '@metamask/ramps-controller';
import type { Payment } from '@consensys/on-ramp-sdk';
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
import { parseRampPaymentType } from '../../Aggregator/utils/parseRampPaymentType';
import styleSheet from './PaymentMethodPill.styles';
import { PAYMENT_METHOD_PILL_TEST_IDS } from './PaymentMethodPill.testIds';

const PAYMENT_METHOD_ICON_SIZE = 16;

/** Controller `PaymentMethod` plus optional SDK-style `icons` from the payment-methods API. */
export type PaymentMethodForPill = Pick<PaymentMethod, 'paymentType'> & {
  icons?: Payment['icons'];
};

export interface PaymentMethodPillProps {
  /** Payment method label (e.g., "Debit card") */
  label: string;
  /** Optional press handler */
  onPress?: () => void;
  /** When true, shows loading indicator instead of carat and disables press */
  isLoading?: boolean;
  /** Test ID for testing */
  testID?: string;
  /**
   * When set (unified buy v2), the leading icon matches the payment method.
   * When omitted or without `paymentType`, shows the generic card icon (e.g. “Select payment method”).
   */
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

  const hasKnownPaymentType =
    parseRampPaymentType(paymentMethod?.paymentType) != null;
  const hasPaymentIcons = (paymentMethod?.icons?.length ?? 0) > 0;
  const shouldRenderMethodIcon = hasKnownPaymentType || hasPaymentIcons;

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
        {shouldRenderMethodIcon ? (
          <PaymentMethodIcon
            paymentMethodIcons={paymentMethod?.icons}
            paymentMethodType={paymentMethod?.paymentType}
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
