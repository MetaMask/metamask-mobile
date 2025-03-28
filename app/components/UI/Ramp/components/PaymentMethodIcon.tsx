import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Payment, PaymentType } from '@consensys/on-ramp-sdk';
import { PaymentIcon, PaymentIconType } from '@consensys/on-ramp-sdk/dist/API';

import AntDesignIcon from 'react-native-vector-icons/AntDesign';

import EvilIconsIcon from 'react-native-vector-icons/EvilIcons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import IoniconsIcon from 'react-native-vector-icons/Ionicons';
import MaterialsIconsIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialsCommunityIconsIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import SimpleLineIconsIcon from 'react-native-vector-icons/SimpleLineIcons';

interface iconParams {
  paymentMethodIcons?: Payment['icons'];
  paymentMethodType?: PaymentType;
  style?: StyleProp<TextStyle>;
  name?: string;
  size: number;
}

enum Icon {
  Apple = 'apple',
  GooglePay = 'google',
  Card = 'credit-card',
  Bank = 'bank',
  Wallet = 'wallet',
}

function getIconComponent(icon: PaymentIcon) {
  switch (icon.type) {
    case PaymentIconType.AntDesign: {
      return AntDesignIcon;
    }
    case PaymentIconType.EvilIcons: {
      return EvilIconsIcon;
    }
    case PaymentIconType.Feather: {
      return FeatherIcon;
    }
    case PaymentIconType.FontAwesome: {
      return FontAwesomeIcon;
    }
    case PaymentIconType.FontAwesome5: {
      return FontAwesome5Icon;
    }
    case PaymentIconType.Fontisto: {
      return null;
    }
    case PaymentIconType.Ionicons: {
      return IoniconsIcon;
    }
    case PaymentIconType.MaterialIcons: {
      return MaterialsIconsIcon;
    }
    case PaymentIconType.MaterialCommunityIcons: {
      return MaterialsCommunityIconsIcon;
    }
    case PaymentIconType.SimpleLineIcons: {
      return SimpleLineIconsIcon;
    }
    default: {
      return null;
    }
  }
}

/*
 * With the integration of Expo, it introduced a compatibility layer (https://github.com/expo/vector-icons)
 * around react-native-vector-icons which doesn't expose hasIcon anymore so we need to build our own based on
 * the implementation https://github.com/oblador/react-native-vector-icons/blob/master/lib/create-icon-set.js#L158
 */
function hasIcon(
  IconComponent: { glyphMap: { [key: string]: number } },
  name: string,
) {
  return (
    IconComponent?.glyphMap &&
    Object.prototype.hasOwnProperty.call(IconComponent.glyphMap, name)
  );
}

function getIcon(icon: PaymentIcon) {
  const IconComponent = getIconComponent(icon);

  if (hasIcon(IconComponent, icon.name)) {
    return IconComponent;
  }
  return null;
}

const PaymentMethodIcon = ({
  paymentMethodIcons,
  paymentMethodType,
  ...props
}: iconParams & Omit<React.ComponentProps<typeof AntDesignIcon>, 'name'>) => {
  if (paymentMethodIcons && paymentMethodIcons.length > 0) {
    const IconComponent = getIcon(paymentMethodIcons[0]);
    if (IconComponent) {
      return <IconComponent name={paymentMethodIcons[0].name} {...props} />;
    }
  }

  if (paymentMethodType) {
    switch (paymentMethodType) {
      case PaymentType.ApplePay: {
        return <FontAwesomeIcon name={Icon.Apple} {...props} />;
      }
      case PaymentType.GooglePay: {
        return <FontAwesomeIcon name={Icon.GooglePay} {...props} />;
      }
      case PaymentType.BankTransfer: {
        return <MaterialsCommunityIconsIcon name={Icon.Bank} {...props} />;
      }
      case PaymentType.DebitCreditCard: {
        return <MaterialsIconsIcon name={Icon.Card} {...props} />;
      }
      case PaymentType.Wallet:
      default: {
        return <SimpleLineIconsIcon name={Icon.Wallet} {...props} />;
      }
    }
  }

  return <SimpleLineIconsIcon name={Icon.Wallet} {...props} />;
};

export default PaymentMethodIcon;
