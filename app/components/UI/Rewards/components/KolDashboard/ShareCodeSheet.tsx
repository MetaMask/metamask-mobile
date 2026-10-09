import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { buildReferralUrl } from '../../utils';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

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
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setIsLinkCopied(false);
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
    setIsLinkCopied(true);
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
      icon: isLinkCopied ? IconName.Confirmation : IconName.Copy,
      iconColor: isLinkCopied ? IconColor.SuccessDefault : undefined,
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
    // BottomSheet lays itself out `absolute inset-0`, so it only covers its
    // parent. Rendered inline in the dashboard it would sit inside the referral
    // card and the overlay would be clipped to it; a full-screen Modal gives it
    // the whole surface to dim. SafeAreaProvider re-measures insets for the
    // Modal's own window (Android) and GestureHandlerRootView keeps
    // swipe-to-dismiss working inside it.
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <BottomSheet
            ref={sheetRef}
            onClose={onClose}
            testID={KOL_DASHBOARD_SELECTORS.SHARE_SHEET}
          >
            <BottomSheetHeader onClose={handleClose}>
              {strings('rewards.kol.share_code')}
            </BottomSheetHeader>
            <Box alignItems={BoxAlignItems.Center} twClassName="px-4 pb-6">
              <Box twClassName="rounded-xl border border-muted bg-default p-3">
                <QRCode value={referralUrl} size={180} />
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                justifyContent={BoxJustifyContent.Center}
                twClassName="mt-6 w-full gap-4"
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
                        <Icon
                          name={action.icon}
                          size={IconSize.Md}
                          color={
                            'iconColor' in action ? action.iconColor : undefined
                          }
                          testID={
                            action.key === 'copyLink' && isLinkCopied
                              ? KOL_DASHBOARD_SELECTORS.COPY_LINK_CHECK
                              : undefined
                          }
                        />
                      </Box>
                      <Text variant={TextVariant.BodyXs}>{action.label}</Text>
                    </Box>
                  </Pressable>
                ))}
              </Box>
            </Box>
          </BottomSheet>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default ShareCodeSheet;
