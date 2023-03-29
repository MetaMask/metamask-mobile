import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import React, { useContext, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import { strings } from '../../../../../locales/i18n';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {},
    text: {
      fontSize: 12,
      color: colors.text.alternative,
      marginVertical: 0,
      lineHeight: 20,
    },
    fiatBalance: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 0,
      lineHeight: 24,
    },
  });

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
