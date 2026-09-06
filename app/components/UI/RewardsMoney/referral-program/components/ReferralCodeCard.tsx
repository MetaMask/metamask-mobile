import React, { useCallback } from 'react';
import ClipboardManager from '../../../../../core/ClipboardManager';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { ReferralCodeView } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';

interface ReferralCodeCardProps {
  code: ReferralCodeView;
  onCopied?: () => void;
}

/**
 * The referrer's code, with copy-to-clipboard.
 */
const ReferralCodeCard: React.FC<ReferralCodeCardProps> = ({
  code,
  onCopied,
}) => {
  const handleCopy = useCallback(async () => {
    await ClipboardManager.setString(code.code);
    onCopied?.();
  }, [code.code, onCopied]);

  return (
    <Box
      twClassName="w-full rounded-2xl bg-background-muted p-4 gap-2"
      testID={REWARDS_MONEY_TEST_IDS.REFERRAL_CODE_CARD}
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('rewards_money.referral.code_label')}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          testID={REWARDS_MONEY_TEST_IDS.REFERRAL_CODE_VALUE}
        >
          {code.code}
        </Text>
        <ButtonIcon
          iconName={IconName.Copy}
          size={ButtonIconSize.Md}
          onPress={handleCopy}
          accessibilityLabel={strings('rewards_money.referral.copy_code')}
          testID="rewards-money-copy-code-button"
        />
      </Box>
    </Box>
  );
};

export default ReferralCodeCard;
