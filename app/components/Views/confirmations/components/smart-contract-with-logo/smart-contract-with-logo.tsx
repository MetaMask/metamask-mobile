import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './smart-contract-with-logo.styles';

const SmartContractWithLogo = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.wrapper}>
      <Icon name={IconName.MetamaskFox} size={IconSize.Sm} />
      <Text style={styles.label}>{strings('confirm.smart_contract')}</Text>
    </View>
  );
};

export default SmartContractWithLogo;
