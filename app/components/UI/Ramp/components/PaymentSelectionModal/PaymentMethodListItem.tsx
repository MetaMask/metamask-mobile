import React from 'react';
import { View } from 'react-native';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import PaymentMethodQuote from './PaymentMethodQuote';
import { formatDelayFromArray } from '../../Aggregator/utils';
import type { PaymentMethod } from '@metamask/ramps-controller';

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
        <View>
          <Icon
            name={IconName.Card}
            size={IconSize.Md}
            color={IconColor.Default}
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
