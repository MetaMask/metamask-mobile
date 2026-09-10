import React, { useCallback } from 'react';
import { InteractionManager, Platform, Share } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';

interface ShareReferralLinkButtonProps {
  /** Server-supplied share URL. The button is not rendered without one. */
  shareUrl: string;
}

/**
 * Shares the referrer's link.
 *
 * The URL comes from the server (`REFERRAL_SHARE_URL_TEMPLATE`) rather than
 * being assembled here, so the link can change without an app release.
 */
const ShareReferralLinkButton: React.FC<ShareReferralLinkButtonProps> = ({
  shareUrl,
}) => {
  const handleShare = useCallback(() => {
    // RN's built-in Share API, not react-native-share: on Android the latter
    // uses startActivityForResult, which notifies every ActivityEventListener
    // and can crash when the sheet is dismissed with a null intent.
    InteractionManager.runAfterInteractions(() => {
      const subject = strings('rewards_money.referral.share_subject');
      const content =
        Platform.OS === 'ios'
          ? { message: subject, url: shareUrl }
          : { message: `${subject}\n${shareUrl}` };

      Share.share(content).catch((error) => {
        Logger.log('Error while trying to share referral link', error);
      });
    });
  }, [shareUrl]);

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      startIconName={IconName.Share}
      onPress={handleShare}
      twClassName="w-full"
      testID={REWARDS_MONEY_TEST_IDS.SHARE_LINK_BUTTON}
    >
      {strings('rewards_money.referral.share_link')}
    </Button>
  );
};

export default ShareReferralLinkButton;
