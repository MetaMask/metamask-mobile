import React from 'react';
import { Image, ImageStyle, StyleProp, TextStyle } from 'react-native';
import { Payment, PaymentType } from '@consensys/on-ramp-sdk';
import { PaymentIcon, PaymentIconType } from '@consensys/on-ramp-sdk/dist/API';

import { useAssetFromTheme } from '../../../../../util/theme';
import { parseRampPaymentType } from '../utils/parseRampPaymentType';
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

/* eslint-disable import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const ApplePayLogoLight = require('images/ApplePayLogo-light.png');
const ApplePayLogoDark = require('images/ApplePayLogo-dark.png');
/* eslint-enable import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

/** Box wider than tall so the mark fits payment rows (e.g. 44px icon circles) without clipping. */
const APPLE_PAY_MARK_WIDTH_RATIO = 1.65;

interface iconParams {
  paymentMethodIcons?: Payment['icons'];
  /** SDK payment type or API string (unknown strings fall back to card when icons are missing). */
  paymentMethodType?: PaymentType | string;
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

function shouldUseBrandedApplePayMark(
  paymentMethodType: PaymentType | undefined,
  firstIcon: PaymentIcon | undefined,
): boolean {
  if (paymentMethodType !== PaymentType.ApplePay || !firstIcon) {
    return false;
  }
  // Backend often maps Apple Pay to a generic FontAwesome "apple" glyph, which
  // is not the Apple Pay mark and can render incorrectly on newer iOS builds.
  return (
    firstIcon.type === PaymentIconType.FontAwesome &&
    firstIcon.name === Icon.Apple
  );
}

const ApplePayMark: React.FC<{
  size: number;
  style?: StyleProp<ImageStyle>;
}> = ({ size, style }) => {
  // `ApplePayLogoLight` / `ApplePayLogoDark` match the full checkout button: light
  // theme uses the white mark on a black button; dark theme uses the dark mark on a
  // white button. PaymentMethodIcon renders on muted / section surfaces instead, so
  // we swap: light app theme → dark artwork, dark app theme → light artwork.
  const source = useAssetFromTheme(ApplePayLogoDark, ApplePayLogoLight);
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={source}
      style={[
        {
          width: Math.round(size * APPLE_PAY_MARK_WIDTH_RATIO),
          height: size,
        },
        style,
      ]}
      resizeMode="contain"
    />
  );
};

const PaymentMethodIcon = ({
  paymentMethodIcons,
  paymentMethodType,
  ...props
}: iconParams & Omit<React.ComponentProps<typeof AntDesignIcon>, 'name'>) => {
  const normalizedPaymentType = parseRampPaymentType(paymentMethodType);

  const firstIcon =
    paymentMethodIcons && paymentMethodIcons.length > 0
      ? paymentMethodIcons[0]
      : undefined;

  if (
    firstIcon &&
    !shouldUseBrandedApplePayMark(normalizedPaymentType, firstIcon)
  ) {
    const IconComponent = getIcon(firstIcon);
    if (IconComponent) {
      return <IconComponent name={firstIcon.name} {...props} />;
    }
  }

  if (normalizedPaymentType) {
    switch (normalizedPaymentType) {
      case PaymentType.ApplePay: {
        return <ApplePayMark size={props.size} style={props.style} />;
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
      case PaymentType.RevPay: {
        return (
          <MaterialsCommunityIconsIcon name="contactless-payment" {...props} />
        );
      }
      case PaymentType.Wallet: {
        return <SimpleLineIconsIcon name={Icon.Wallet} {...props} />;
      }
      default: {
        return <MaterialsIconsIcon name={Icon.Card} {...props} />;
      }
    }
  }

  if (paymentMethodType == null || paymentMethodType === '') {
    return <SimpleLineIconsIcon name={Icon.Wallet} {...props} />;
  }

  return <MaterialsIconsIcon name={Icon.Card} {...props} />;
};

export default PaymentMethodIcon;
