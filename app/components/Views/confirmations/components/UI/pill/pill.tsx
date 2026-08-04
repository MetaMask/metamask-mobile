import React from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './pill.styles';
import { Text, TextVariant } from '@metamask/design-system-react-native';

export const Pill = ({ text, testID }: { text: string; testID?: string }) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodyMd} testID={testID}>
        {text}
      </Text>
    </View>
  );
};
