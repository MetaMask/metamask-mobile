import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './Balance.styles';

interface BalanceProps {
  balance: string;
  fiatBalance: string;
}

const Balance = ({ balance, fiatBalance }: BalanceProps) => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.wrapper}>
      <Text style={styles.text}>{strings('asset_overview.your_balance')}</Text>
      <Title style={styles.fiatBalance}>
        {fiatBalance || strings('asset_overview.unable_to_load_balance')}
      </Title>
      <Text style={styles.text}>{balance}</Text>
    </View>
  );
};

export default Balance;
