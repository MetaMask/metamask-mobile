import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';

const createStyles = () => {
  const grey = '#535A61';
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    text: {
      fontSize: 12,
      color: grey,
      marginVertical: 0,
    },
    fiatBalance: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 0,
    },
  });
};

interface BalanceProps {
  balance: string;
  fiatBalance: string;
}

const Balance = ({ balance, fiatBalance }: BalanceProps) => {
  const styles = createStyles();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.text}>Your Balance</Text>
      <Title style={styles.fiatBalance}>
        {fiatBalance || 'Unable to load balance'}
      </Title>
      <Text style={styles.text}>{balance}</Text>
    </View>
  );
};

export default Balance;
