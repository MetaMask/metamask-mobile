import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { TokenI } from '../../../Tokens/types';
import TokenIcon from '../../../Tokens/TokenIcon';
import styleSheet from './TokenListItem.styles';

interface TokenListItemProps {
  token: TokenI;
  onPress: (token: TokenI) => void;
  primaryText?: {
    value: string;
    color?: TextColor;
  };
  secondaryText?: {
    value: string;
    color?: TextColor;
  };
}

const TokenListItem = ({
  token,
  onPress,
  primaryText,
  secondaryText,
}: TokenListItemProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(token)}
      activeOpacity={0.5}
    >
      <View style={styles.leftContent}>
        <TokenIcon token={token} />
        <View style={styles.textContainer}>
          <Text variant={TextVariant.BodyMD}>{token.symbol}</Text>
          {primaryText && (
            <Text
              variant={TextVariant.BodyMD}
              color={primaryText.color || TextColor.Default}
            >
              {primaryText.value}
            </Text>
          )}
        </View>
      </View>
      {secondaryText && (
        <Text
          variant={TextVariant.BodyMD}
          color={secondaryText.color || TextColor.Alternative}
        >
          {secondaryText.value}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default TokenListItem;
