/* eslint-disable react-native/no-color-literals */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
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
      marginVertical: 12,
      marginBottom: 24,
    },
    iconSquared: {
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
    iconCircled: {
      padding: 10,
      backgroundColor: colors.background.alternative,
      width: 60,
      height: 60,
      borderRadius: 30,
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

const renderServiceItem = (
  item: any,
  styles: any,
  type: 'squared' | 'circled' = 'squared',
) => {
  const styleType =
    type === 'squared' ? styles.iconSquared : styles.iconCircled;

  return (
    <TouchableOpacity
      key={item.name}
      style={styles.items}
      onPress={item.onPressNavigation}
    >
      <View style={styleType}>
        <Image source={item.icon} />
      </View>
      <Text variant={TextVariant.BodyMD}>{item.name}</Text>
    </TouchableOpacity>
  );
};

const ListService = ({ type }: { type: 'squared' | 'circled' }) => {
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
      <View style={styles.list}>
        {listService.map((item) => renderServiceItem(item, styles, type))}
      </View>
    </View>
  );
};

export default ListService;
