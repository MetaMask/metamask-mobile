import React, { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

interface TokenDetailsListItemProps {
  label: string;
  value?: string | number;
  style: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const TokenDetailsListItem: React.FC<TokenDetailsListItemProps> = ({
  label,
  value,
  style,
  children,
}) => (
  <View style={style}>
    <Text color={TextColor.Alternative} variant={TextVariant.BodyMDMedium}>
      {label}
    </Text>
    {children || (
      <Text variant={TextVariant.BodySM} color={TextColor.Default}>
        {value}
      </Text>
    )}
  </View>
);

export default TokenDetailsListItem;
