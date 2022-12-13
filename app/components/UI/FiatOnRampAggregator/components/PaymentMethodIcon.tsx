import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Payment, PaymentType } from '@consensys/on-ramp-sdk';
import { PaymentIcon, PaymentIconType } from '@consensys/on-ramp-sdk/dist/API';

import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import EvilIconsIcon from 'react-native-vector-icons/EvilIcons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
// import FontistoIcon from 'react-native-vector-icons/Fontisto';
import FoundationIcon from 'react-native-vector-icons/Foundation';
import IoniconsIcon from 'react-native-vector-icons/Ionicons';
import MaterialsIconsIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialsCommunityIconsIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import OcticonsIcon from 'react-native-vector-icons/Octicons';
import SimpleLineIconsIcon from 'react-native-vector-icons/SimpleLineIcons';
import ZocialIcon from 'react-native-vector-icons/Zocial';

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
    case PaymentIconType.Entypo: {
      return EntypoIcon;
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
    case PaymentIconType.Foundation: {
      return FoundationIcon;
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
    case PaymentIconType.Octicons: {
      return OcticonsIcon;
    }
    case PaymentIconType.SimpleLineIcons: {
      return SimpleLineIconsIcon;
    }
    case PaymentIconType.Zocial: {
      return ZocialIcon;
    }
    default: {
      return null;
    }
  }
}

function getIcon(icon: PaymentIcon) {
  const IconComponent = getIconComponent(icon);
  if (IconComponent?.hasIcon(icon.name)) {
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
