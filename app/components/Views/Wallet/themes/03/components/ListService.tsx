/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../../../util/theme';

const listService = [
  {
    name: 'Wallet',
    icon: require('../assets/ic_wallet.png'),
  },
  {
    name: 'Transfer',
    icon: require('../assets/ic_transfer.png'),
  },
  {
    name: 'Pay',
    icon: require('../assets/ic_pay.png'),
  },
  {
    name: 'Top Up',
    icon: require('../assets/ic_topup.png'),
  },
];

const styleSheet = (colors: any) =>
  StyleSheet.create({
    title: {
      fontWeight: 'bold',
      fontSize: 18,
    },
    list: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    icon: {
      padding: 10,
      backgroundColor: colors.background.default,
      width: 60,
      height: 60,
      shadowColor: '#000',
      shadowOffset: { height: 10, width: 2 },
      shadowOpacity: 0.7,
      shadowRadius: 80,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    items: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemText: {
      marginTop: 10,
    },
  });

const renderServiceItem = (item: any, styles: any) => (
  <View key={item.name} style={styles.items}>
    <View style={styles.icon}>
      <Image source={item.icon} />
    </View>
    <Text style={styles.itemText}>{item.name}</Text>
  </View>
);

const ListService = () => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  return (
    <View>
      <Text style={styles.title}>Service</Text>
      <View style={styles.list}>{listService.map((item) => renderServiceItem(item, styles))}</View>
    </View>
  );
};

export default ListService;
