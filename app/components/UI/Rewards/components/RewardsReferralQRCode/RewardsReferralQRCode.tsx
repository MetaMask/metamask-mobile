import React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useStyles } from '../../../../../component-library/hooks';
import PNG_MM_LOGO_PATH from '../../../../../images/branding/fox.png';
import { buildReferralUrl } from '../../utils';
import styleSheet from './RewardsReferralQRCode.styles';

interface RewardsReferralQRCodeProps {
  /**
   * The referral code to encode in the QR code
   */
  referralCode: string;
  /**
   * Size of the QR code in pixels
   * @default 160
   */
  size?: number;
}

const RewardsReferralQRCode: React.FC<RewardsReferralQRCodeProps> = ({
  referralCode,
  size = 160,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const referralUrl = buildReferralUrl(referralCode);

  const logoSize = Math.round(size * 0.25);

  return (
    <View style={styles.container}>
      <QRCode
        value={referralUrl}
        size={size}
        logo={PNG_MM_LOGO_PATH}
        logoSize={logoSize}
        logoBorderRadius={8}
      />
    </View>
  );
};

export default RewardsReferralQRCode;
