import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import MaterialsCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialsIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';

interface iconParams {
  iconType: Icon;
  style?: StyleProp<TextStyle>;
  name?: string;
  size: number;
}

export enum Icon {
  Apple = 'apple',
  GooglePay = 'google',
  Card = 'credit-card',
  Bank = 'bank',
  Wallet = 'wallet',
}

const PaymentIcon = ({
  iconType,
  name: _name,
  ...props
}: iconParams &
  Omit<React.ComponentProps<typeof FontAwesome>, 'name'> &
  Omit<React.ComponentProps<typeof MaterialsCommunityIcons>, 'name'> &
  Omit<React.ComponentProps<typeof MaterialsIcons>, 'name'>) => {
  switch (iconType) {
    case Icon.Apple: {
      return <FontAwesome name={Icon.Apple} {...props} />;
    }
    case Icon.GooglePay: {
      return <FontAwesome name={Icon.GooglePay} {...props} />;
    }
    case Icon.Bank: {
      return <MaterialsCommunityIcons name={Icon.Bank} {...props} />;
    }
    case Icon.Card: {
      return <MaterialsIcons name={Icon.Card} {...props} />;
    }
    case Icon.Wallet:
    default: {
      return <SimpleLineIcons name={Icon.Wallet} {...props} />;
    }
  }
};

export default PaymentIcon;
