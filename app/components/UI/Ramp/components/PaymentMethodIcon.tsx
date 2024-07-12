import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { PaymentType } from '@consensys/on-ramp-sdk';

import Icon from 'app/component-library/components/Icons/Icon/Icon';
import {
  IconName,
  IconSize,
} from 'app/component-library/components/Icons/Icon/Icon.types';

interface iconParams {
  paymentMethodIcons?: { name: IconName }[];
  paymentMethodType?: PaymentType;
  style?: StyleProp<TextStyle>;
  size?: IconSize;
}

const PaymentMethodIcon = ({
  paymentMethodIcons,
  paymentMethodType,
  style,
  size,
}: iconParams) => {
  if (paymentMethodIcons && paymentMethodIcons.length > 0) {
    return <Icon name={paymentMethodIcons[0].name} style={style} size={size} />;
  }

  if (paymentMethodType) {
    switch (paymentMethodType) {
      case PaymentType.ApplePay:
        return <Icon name={IconName.Bank} style={style} size={size} />; // Using 'Bank' as a placeholder for 'ApplePay'
      case PaymentType.GooglePay:
        return <Icon name={IconName.Card} style={style} size={size} />; // Using 'Card' as a placeholder for 'GooglePay'
      case PaymentType.BankTransfer:
        return <Icon name={IconName.Bank} style={style} size={size} />;
      case PaymentType.DebitCreditCard:
        return <Icon name={IconName.Card} style={style} size={size} />;
      case PaymentType.Wallet:
      default:
        return <Icon name={IconName.Wallet} style={style} size={size} />;
    }
  }

  return <Icon name={IconName.Wallet} style={style} size={size} />;
};

export default PaymentMethodIcon;
