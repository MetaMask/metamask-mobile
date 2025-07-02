import React from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import styleSheet from './pill.styles';

export const Pill = ({ text }: { text: string }) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodyMD}>{text}</Text>
    </View>
  );
};
