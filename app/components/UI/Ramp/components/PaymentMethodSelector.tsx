import React, { ReactNode } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Box from './Box';
import Entypo from 'react-native-vector-icons/Entypo';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import ListItem from '../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    chevron: {
      marginLeft: 10,
      color: colors.icon.default,
    },
    icon: {
      width: 28,
      height: 18,
      marginRight: 8,
    },
    iconContainer: {
      flexDirection: 'row',
      margin: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
      marginLeft: 16,
      marginRight: 16,
    },
  });

interface IProps {
  id?: string;
  name?: string;
  label?: string;
  icon?: ReactNode;
  highlighted?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress?: () => any;
  paymentMethodIcons?: string[];
}

const PaymentMethodSelector: React.FC<IProps> = ({
  name,
  icon,
  label,
  highlighted,
  onPress,
  paymentMethodIcons = [],
}: IProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Box label={label} onPress={onPress} highlighted={highlighted} compact>
      <ListItem>
        {Boolean(icon) && <ListItemColumn>{icon}</ListItemColumn>}
        <ListItemColumn widthType={WidthType.Fill}>
          <Text
            variant={TextVariant.BodyLGMedium}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {name}
          </Text>
        </ListItemColumn>
        <ListItemColumn>
          <Entypo name="chevron-down" size={16} style={styles.chevron} />
        </ListItemColumn>
      </ListItem>
      <View style={styles.divider} />
      <View style={styles.iconContainer}>
        {paymentMethodIcons.map((imgSrc) => (
          <Image key={imgSrc} source={{ uri: imgSrc }} style={styles.icon} />
        ))}
      </View>
    </Box>
  );
};

export default PaymentMethodSelector;
