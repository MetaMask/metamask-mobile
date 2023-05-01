import React, { useContext, useMemo } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import createStyles from './Balance.styles';

interface BalanceProps {
  balance: string;
  fiatBalance: string;
}

const Balance = ({ balance, fiatBalance }: BalanceProps) => {
  const { colors = mockTheme.colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
