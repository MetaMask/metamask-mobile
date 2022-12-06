import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { Payment } from '@consensys/on-ramp-sdk';
import { useAssetFromTheme } from '../../../../util/theme';
import RemoteImage from '../../../Base/RemoteImage';
interface Props {
  style?: StyleProp<ImageStyle>;
  logosByTheme: Payment['logo'];
}

const PaymentMethodBadges: React.FC<Props> = ({
  logosByTheme,
  style,
}: Props) => {
  const theme: 'light' | 'dark' = useAssetFromTheme('light', 'dark');

  const logos = logosByTheme[theme];

  return (
    <>
      {logos.map((logoURL: string) => (
        <RemoteImage key={logoURL} source={{ uri: logoURL }} style={style} />
      ))}
    </>
  );
};

export default PaymentMethodBadges;
