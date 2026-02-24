import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  IconColor as DsIconColor,
  IconSize as DsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';

import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';

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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]} testID={testID}>
        <Spinner
          color={DsIconColor.IconAlternative}
          spinnerIconProps={{ size: DsIconSize.Sm }}
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
