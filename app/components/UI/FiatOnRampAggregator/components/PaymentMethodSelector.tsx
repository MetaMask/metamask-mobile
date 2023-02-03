import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Box from './Box';
import Entypo from 'react-native-vector-icons/Entypo';
import { useTheme } from '../../../../util/theme';

import ListItemBase from '../../../Base/ListItem';
import Text from '../../../Base/Text';
import { Colors } from '../../../../util/theme/models';

// TODO: Convert into typescript and correctly type
const ListItem = ListItemBase as any;

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
    <Box label={label} onPress={onPress} highlighted={highlighted} thin>
      <View>
        <ListItem.Content>
          {Boolean(icon) && <ListItem.Icon>{icon}</ListItem.Icon>}
          <ListItem.Body>
            <Text black bold numberOfLines={1} adjustsFontSizeToFit>
              {name}
            </Text>
          </ListItem.Body>
          <ListItem.Amount>
            <Entypo name="chevron-right" size={16} style={styles.chevron} />
          </ListItem.Amount>
        </ListItem.Content>
      </View>
    </Box>
  );
};

export default PaymentMethodSelector;
