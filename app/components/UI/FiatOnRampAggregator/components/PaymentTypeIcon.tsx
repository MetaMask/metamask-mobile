import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { Payment } from '@consensys/on-ramp-sdk';
import { useAssetFromTheme } from '../../../../util/theme';
import RemoteImage from '../../../Base/RemoteImage';
interface Props {
  id?: string;
  style?: StyleProp<ImageStyle>;
  logo: Payment['logo'];
}

const PaymentTypeIcon: React.FC<Props> = ({ logo, style }: Props) => {
  const mode: 'light' | 'dark' = useAssetFromTheme('light', 'dark');

  const logos = logo[mode];

  return (
    <>
      {logos.map((logoURL: string) => (
        <RemoteImage key={logoURL} source={{ uri: logoURL }} style={style} />
      ))}
    </>
  );
};

export default PaymentTypeIcon;
