import React, { useContext } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import FoxRewardIcon from '../../../../../images/rewards/metamask-rewards-points.svg';
import TempTouchableOpacity from '../../../../../component-library/components-temp/TempTouchableOpacity';
import styleSheet from './RewardsReferralCodeTag.styles';
import ClipboardManager from '../../../../../core/ClipboardManager';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
interface RewardsReferralCodeTagProps {
  referralCode: string;
  backgroundColor?: string;
  fontColor?: string;
}

const RewardsReferralCodeTag: React.FC<RewardsReferralCodeTagProps> = ({
  referralCode,
  backgroundColor,
  fontColor,
}) => {
  const { styles } = useStyles(styleSheet, {
    backgroundColor,
    fontColor,
  });

  const { toastRef } = useContext(ToastContext);

  const handleCopyToClipboard = () => {
    ClipboardManager.setString(referralCode);

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Copy,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('rewards.referral.referral_code_copied'),
          isBold: true,
        },
      ],
    });
  };

  return (
    <TempTouchableOpacity
      style={styles.container}
      onPress={handleCopyToClipboard}
    >
      <View style={styles.iconContainer}>
        {/* We can add support for configurable icons later */}
        <FoxRewardIcon name="fox-reward-icon" width={14} height={14} />
      </View>
      <Text style={styles.referralCode} variant={TextVariant.BodyMDMedium}>
        {referralCode}
      </Text>
    </TempTouchableOpacity>
  );
};

export default RewardsReferralCodeTag;
