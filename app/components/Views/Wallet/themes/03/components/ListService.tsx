/* eslint-disable react-native/no-color-literals */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../../../../util/theme';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

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
  <TouchableOpacity
    key={item.name}
    style={styles.items}
    onPress={item.onPressNavigation}
  >
    <View style={styles.icon}>
      <Image source={item.icon} />
    </View>
    <Text style={styles.itemText}>{item.name}</Text>
  </TouchableOpacity>
);

const ListService = () => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  const navigation = useNavigation();
  const listService = [
    {
      name: 'Buy',
      icon: require('../assets/ic_pay.png'),
      onPressNavigation: () => navigation.navigate(Routes.RAMP.BUY),
    },
    {
      name: 'Send',
      icon: require('../assets/ic_wallet.png'),
      onPressNavigation: () => navigation.navigate('SendFlowView'),
    },
    {
      name: 'Swap',
      icon: require('../assets/ic_transfer.png'),
      onPressNavigation: () => navigation.navigate(Routes.SWAPS),
    },
    {
      name: 'Pay',
      icon: require('../assets/ic_topup.png'),
      onPressNavigation: () => navigation.navigate(Routes.QR_SCANNER),
    },
  ];

  return (
    <View>
      <Text style={styles.title}>Service</Text>
      <View style={styles.list}>
        {listService.map((item) => renderServiceItem(item, styles))}
      </View>
    </View>
  );
};

export default ListService;
