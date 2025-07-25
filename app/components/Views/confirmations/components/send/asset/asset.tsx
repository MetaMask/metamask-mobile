import React from 'react';
import { View } from 'react-native';

import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { useSendContext } from '../../../context/send-context';
import styleSheet from './asset.styles';

const Asset = () => {
  const { styles } = useStyles(styleSheet, {});
  const { asset } = useSendContext();

  return (
    <View style={styles.container}>
      <Text>Asset: {asset?.address ?? 'NA'}</Text>
    </View>
  );
};

export default Asset;
