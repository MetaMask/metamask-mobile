import React from 'react';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import VipIcon from '../../../../../images/rewards/vip.svg';
import styleSheet from './RewardsReferralCodeTag.styles';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { TouchableOpacity } from 'react-native';

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

  const handleCopyToClipboard = () => {
    ClipboardManager.setString(referralCode);

    toast({
      title: strings('rewards.referral.referral_code_copied'),
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleCopyToClipboard}>
      <VipIcon name="VipIcon" width={12} height={12} />
      <Text style={styles.referralCode} variant={TextVariant.BodySMMedium}>
        {referralCode}
      </Text>
    </TouchableOpacity>
  );
};

export default RewardsReferralCodeTag;
