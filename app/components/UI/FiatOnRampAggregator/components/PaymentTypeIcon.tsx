import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { useAssetFromTheme } from '../../../../util/theme';
import { Image } from 'react-native-animatable';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const VisaLight = require('./images/Visa-regular.png');
const VisaDark = require('./images/Visa.png');
const MastercardLight = require('./images/Mastercard-regular.png');
const MastercardDark = require('./images/Mastercard.png');
const SepaLight = require('./images/SEPABankTransfer-regular.png');
const SepaDark = require('./images/SEPABankTransfer.png');
const AchLight = require('./images/ACHBankTransfer-regular.png');
const AchDark = require('./images/ACHBankTransfer.png');
const GbpLight = require('./images/GBPBankTransfer-regular.png');
const GbpDark = require('./images/GBPBankTransfer.png');
const UpiLight = require('./images/UPI-regular.png');
const UpiDark = require('./images/UPI.png');
/* eslint-enable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

interface Props {
  id?: string;
  style?: StyleProp<ImageStyle>;
}

const PaymentTypeIcon: React.FC<Props> = ({ id, style }: Props) => {
  const visa = useAssetFromTheme(VisaLight, VisaDark);
  const sepa = useAssetFromTheme(SepaLight, SepaDark);
  const mastercard = useAssetFromTheme(MastercardLight, MastercardDark);
  const ach = useAssetFromTheme(AchLight, AchDark);
  const gbp = useAssetFromTheme(GbpLight, GbpDark);
  const upi = useAssetFromTheme(UpiLight, UpiDark);
  switch (id) {
    case '/payments/gbp-bank-transfer': {
      return <Image source={gbp} style={style} />;
    }
    case '/payments/sepa-bank-transfer': {
      return <Image source={sepa} style={style} />;
    }
    case '/payments/upi': {
      return <Image source={upi} style={style} />;
    }
    case '/payments/ach-bank-transfer':
    case '/payments/bank-account': {
      return <Image source={ach} style={style} />;
    }
    case '/payments/apple-pay':
    case '/payments/debit-credit-card':
    default:
      return (
        <>
          <Image source={visa} style={style} />
          <Image source={mastercard} style={style} />
        </>
      );
  }
};

export default PaymentTypeIcon;
