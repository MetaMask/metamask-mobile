/* eslint-disable @typescript-eslint/no-require-imports */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../../../../util/theme';
import AvatarNetwork from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
const listTransations = [
  {
    type: 'Linea',
    icon: require('../../../../../../images/linea-mainnet-logo.png'),
    date: 'Jun 12, 12:30',
    payment: '+ $12',
  },
  {
    type: 'Avalanche',
    icon: require('../../../../../../images/avalanche.png'),
    date: 'Jun 12, 12:30',
    payment: '+ $12',
  },
  {
    type: 'Linea2',
    icon: require('../../../../../../images/linea-mainnet-logo.png'),
    date: 'Jun 12, 12:30',
    payment: '+ $14',
  },
];

const styleSheet = (colors: any) =>
  StyleSheet.create({
    title: {
      fontWeight: 'bold',
      fontSize: 18,
    },
    container: {
      marginTop: 12,
    },
    items: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 22,
      maxHeight: 64,
      overflow: 'hidden',
    },
    itemBody: {
      flex: 1,
      paddingLeft: 14,
    },
    type: {
      fontWeight: '500',
      fontSize: 16,
    },

    date: {
      marginTop: 5,
    },

    payment: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    networkIcon: {
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
  });

const renderTransactionItem = (item: any, styles: any) => (
  <View key={item.type} style={styles.items}>
    <View style={styles.icon}>
      <AvatarNetwork
        variant={AvatarVariant.Network}
        imageSource={item.icon}
        style={styles.networkIcon}
        size={AvatarSize.Md}
      />
    </View>
    <View style={styles.itemBody}>
      <Text style={styles.type}>{item.type}</Text>
      <Text style={styles.date}>{item.date}</Text>
    </View>
    <View>
      <Text style={styles.payment}>{item.payment}</Text>
    </View>
  </View>
);

const RecentTransaction = () => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  return (
    <View style={styles.container}>
      <Text variant={TextVariant.HeadingMD}>Recent Transaction</Text>
      <View>
        {listTransations.map((item) => renderTransactionItem(item, styles))}
      </View>
    </View>
  );
};

export default RecentTransaction;
