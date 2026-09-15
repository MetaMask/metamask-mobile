import React, { useCallback, useEffect, useRef } from 'react';
import { Linking, Platform, Pressable, Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { buildReferralUrl } from '../../utils';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

interface ShareCodeSheetProps {
  isVisible: boolean;
  referralCode: string;
  onClose: () => void;
}

const ShareCodeSheet: React.FC<ShareCodeSheetProps> = ({
  isVisible,
  referralCode,
  onClose,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const referralUrl = buildReferralUrl(referralCode);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleShareVia = useCallback(() => {
    const subject = strings('rewards.referral.actions.share_referral_subject');
    const shareContent =
      Platform.OS === 'ios'
        ? { message: subject, url: referralUrl }
        : { message: `${subject}\n${referralUrl}` };

    Share.share(shareContent).catch((error) => {
      Logger.log('Error while trying to share referral link', error);
    });
  }, [referralUrl]);

  const handleCopyLink = useCallback(() => {
    Clipboard.setString(referralUrl);
  }, [referralUrl]);

  const handleMessages = useCallback(() => {
    Linking.openURL(`sms:&body=${encodeURIComponent(referralUrl)}`).catch(
      (error) => {
        Logger.log('Error while opening messages for referral link', error);
      },
    );
  }, [referralUrl]);

  const handleTelegram = useCallback(() => {
    Linking.openURL(
      `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}`,
    ).catch((error) => {
      Logger.log('Error while opening Telegram for referral link', error);
    });
  }, [referralUrl]);

  if (!isVisible) {
    return null;
  }

  const actions = [
    {
      key: 'shareVia',
      label: strings('rewards.kol.share_via'),
      icon: IconName.Export,
      testID: KOL_DASHBOARD_SELECTORS.SHARE_VIA,
      onPress: handleShareVia,
    },
    {
      key: 'copyLink',
      label: strings('rewards.kol.copy_link'),
      icon: IconName.Copy,
      testID: KOL_DASHBOARD_SELECTORS.COPY_LINK,
      onPress: handleCopyLink,
    },
    {
      key: 'messages',
      label: strings('rewards.kol.messages'),
      icon: IconName.Messages,
      testID: KOL_DASHBOARD_SELECTORS.SHARE_MESSAGES,
      onPress: handleMessages,
    },
    {
      key: 'telegram',
      label: strings('rewards.kol.telegram'),
      icon: IconName.Send,
      testID: KOL_DASHBOARD_SELECTORS.SHARE_TELEGRAM,
      onPress: handleTelegram,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={onClose}
      testID={KOL_DASHBOARD_SELECTORS.SHARE_SHEET}
    >
      <BottomSheetHeader onClose={handleClose}>
        {strings('rewards.kol.share_code')}
      </BottomSheetHeader>
      <Box alignItems={BoxAlignItems.Center} twClassName="px-4 pb-6">
        <Box twClassName="rounded-xl bg-default p-3">
          <QRCode value={referralUrl} size={180} />
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mt-6 w-full px-2"
        >
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              onPress={action.onPress}
              testID={action.testID}
            >
              <Box alignItems={BoxAlignItems.Center} twClassName="gap-2">
                <Box
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Center}
                  twClassName="h-12 w-12 rounded-full bg-muted"
                >
                  <Icon name={action.icon} size={IconSize.Md} />
                </Box>
                <Text variant={TextVariant.BodyXs}>{action.label}</Text>
              </Box>
            </Pressable>
          ))}
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ShareCodeSheet;
