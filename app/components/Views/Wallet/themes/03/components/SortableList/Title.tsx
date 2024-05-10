/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { SIZE } from './Config';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../../util/theme';

const styleSheet = (colors: any) =>
  StyleSheet.create({
  container: {
    width: SIZE - 40,
    height: SIZE - 40,
    backgroundColor: colors.background.alternative,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
interface TileProps {
  id: string;
  onLongPress: () => void;
}

const Title = ({ id }: TileProps) => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  if (id === 'spent') {
    return (
      <View style={styles.container} pointerEvents="none">
        <Text color={TextColor.Muted} variant={TextVariant.BodyMD}>
          Earned
        </Text>
        <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
          +1024€
        </Text>
      </View>
    );
  }

  if (id === 'cashback') {
    return (
      <View style={styles.container} pointerEvents="none">
            <Text color={TextColor.Muted} variant={TextVariant.BodyMD}>
            Portfolio
          </Text>
            <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
              +5%
            </Text>

      </View>
    );
  }

  if (id === 'recent') {
    return (
      <View style={styles.container} pointerEvents="none">
          <Text color={TextColor.Muted} variant={TextVariant.BodyMD}>Market News</Text>
          <Icon
          name={IconName.Info}
          size={IconSize.Lg}
          color={IconColor.Default}
        />
      </View>
    );
  }

  if (id === 'cards') {
    return (
      <View style={styles.container} pointerEvents="none">
        <Text color={TextColor.Muted} variant={TextVariant.BodyMD}>
          Accounts
        </Text>
        <Icon
          name={IconName.ProgrammingArrows}
          size={IconSize.Lg}
          color={IconColor.Default}
        />
      </View>
    );
  }
};

export default Title;
