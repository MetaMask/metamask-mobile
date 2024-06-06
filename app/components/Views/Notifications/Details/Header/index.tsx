import React from 'react';
import { View } from 'react-native';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { createStyles } from '../styles';

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.header}>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
        {title}
      </Text>
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {subtitle}
      </Text>
    </View>
  );
};

export default Header;
