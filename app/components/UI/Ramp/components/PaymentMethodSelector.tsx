import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
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
}

const PaymentMethodSelector: React.FC<IProps> = ({
  name,
  icon,
  label,
  highlighted,
  onPress,
}: IProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Box label={label} onPress={onPress} highlighted={highlighted} compact>
      <View>
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
            <Entypo name="chevron-right" size={16} style={styles.chevron} />
          </ListItemColumn>
        </ListItem>
      </View>
    </Box>
  );
};

export default PaymentMethodSelector;
