import React from 'react';
import { View, StyleSheet } from 'react-native';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { PaymentType } from '@consensys/on-ramp-sdk';
import PaymentMethodIcon from '../../Aggregator/components/PaymentMethodIcon';
import PaymentMethodQuote from './PaymentMethodQuote';
import { formatDelayFromArray } from '../../Aggregator/utils';
import { useTheme } from '../../../../../util/theme';
import type { Colors } from '../../../../../util/theme/models';
import type { PaymentMethod } from '@metamask/ramps-controller';

const ICON_CIRCLE_SIZE = 44;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    iconCircle: {
      width: ICON_CIRCLE_SIZE,
      height: ICON_CIRCLE_SIZE,
      borderRadius: ICON_CIRCLE_SIZE / 2,
      backgroundColor: colors.background.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconCircleSelected: {
      backgroundColor: colors.primary.muted,
    },
  });

interface PaymentMethodListItemProps {
  paymentMethod: PaymentMethod;
  onPress?: () => void;
  isSelected?: boolean;
}

const PaymentMethodListItem: React.FC<PaymentMethodListItemProps> = ({
  paymentMethod,
  onPress,
  isSelected = false,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const mockQuote = {
    cryptoAmount: '0.10596 ETH',
    fiatAmount: '~ $499.97',
  };

  const delayText =
    Array.isArray(paymentMethod.delay) && paymentMethod.delay.length >= 2
      ? formatDelayFromArray(paymentMethod.delay)
      : null;

  return (
    <ListItemSelect
      isSelected={isSelected}
      onPress={onPress}
      accessibilityRole="button"
      accessible
    >
      <ListItemColumn widthType={WidthType.Auto}>
        <View
          style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}
        >
          <PaymentMethodIcon
            paymentMethodType={paymentMethod.paymentType as PaymentType}
            size={24}
            color={isSelected ? colors.primary.default : colors.icon.default}
          />
        </View>
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        <Text variant={TextVariant.BodyLGMedium}>{paymentMethod.name}</Text>
        {delayText ? (
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {delayText}
          </Text>
        ) : null}
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Auto}>
        <PaymentMethodQuote
          cryptoAmount={mockQuote.cryptoAmount}
          fiatAmount={mockQuote.fiatAmount}
        />
      </ListItemColumn>
    </ListItemSelect>
  );
};

export default PaymentMethodListItem;
