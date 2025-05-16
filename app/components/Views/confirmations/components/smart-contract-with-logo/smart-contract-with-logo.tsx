import React from 'react';
import { Image, View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './smart-contract-with-logo.styles';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const foxImage = require('../../../../../images/branding/fox.png');

const SmartContractWithLogo = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.wrapper}>
      <Image source={foxImage} style={styles.image} />
      <Text style={styles.label}>{strings('confirm.smart_contract')}</Text>
    </View>
  );
};

export default SmartContractWithLogo;
