import React from 'react';
import { ImageStyle } from 'react-native';
import { Payment } from '@consensys/on-ramp-sdk';
import { useTheme } from '../../../../../util/theme';
import RemoteImage from '../../../../Base/RemoteImage';
interface Props {
  style?: ImageStyle;
  logosByTheme: Payment['logo'];
}

const PaymentMethodBadges: React.FC<Props> = ({
  logosByTheme,
  style,
}: Props) => {
  const { themeAppearance } = useTheme();

  const logos = logosByTheme[themeAppearance];

  return (
    <>
      {logos.map((logoURL: string) => (
        <RemoteImage key={logoURL} source={{ uri: logoURL }} style={style} />
      ))}
    </>
  );
};

export default PaymentMethodBadges;
