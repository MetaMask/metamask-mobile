import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Modal, Platform, Share, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import Pressable from '../../../../../component-library/components-temp/Pressable/Pressable';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { resolveMoneyShareUrl } from '../../utils/moneyShareUrl';

export const SHARE_CODE_SHEET_TEST_IDS = {
  CONTAINER: 'share-code-sheet',
  CLOSE: 'share-code-sheet-close',
  QR: 'share-code-sheet-qr',
  SHARE_VIA: 'share-code-sheet-share-via',
  COPY_LINK: 'share-code-sheet-copy-link',
  COPY_LINK_CHECK: 'share-code-sheet-copy-link-check',
  MESSAGES: 'share-code-sheet-messages',
  TELEGRAM: 'share-code-sheet-telegram',
} as const;

export type RewardsReferralShareMethod =
  | 'share_via'
  | 'copy_link'
  | 'messages'
  | 'telegram';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const QR_SIZE = 180;

/**
 * Caption from `inviteBody` for SMS and Telegram. `{url}` is stripped (the
 * link is attached separately). A leftover `{placeholder}` is not sendable.
 */
export function buildShareInviteText(template: string | undefined): string {
  const trimmed = template?.trim() ?? '';
  if (!trimmed) {
    return '';
  }
  const withoutUrlPlaceholder = trimmed
    .replaceAll('{url}', ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!withoutUrlPlaceholder || /\{[^{}]+\}/.test(withoutUrlPlaceholder)) {
    return '';
  }
  return withoutUrlPlaceholder;
}

/** SMS has no separate URL field, so the link rides in the body. */
export function buildShareSmsBody(
  template: string | undefined,
  url: string,
): string {
  const text = buildShareInviteText(template);
  return text ? `${text} ${url}` : url;
}

/**
 * Share copy, resolved per key.
 *
 * The server fills every `localized_text` key from its own defaults, so a
 * missing key means there is no referral-me payload — and this sheet is only
 * mounted for a referrer read out of one. Only the title has an existing Mobile
 * string to fall back on; an action whose label is missing is left out rather
 * than rendered as an unlabelled circle.
 */
function useShareCopy(localizedText: ReferralLocalizedText | undefined) {
  return useMemo(
    () => ({
      title:
        localizedText?.shareCode ??
        strings('rewards.referral.actions.share_referral_link'),
      shareVia: localizedText?.shareVia ?? '',
      copyLink: localizedText?.copyLink ?? '',
      messages: localizedText?.messages ?? '',
      telegram: localizedText?.telegram ?? '',
      inviteBody: localizedText?.inviteBody ?? '',
    }),
    [localizedText],
  );
}

export interface ShareCodeSheetProps {
  /** Owned by the parent: this sheet never routes and never navigates back. */
  open: boolean;
  /** `referral_code.code` from `GET /referral/me`. */
  code: string | null | undefined;
  /** `referral_code.share_url`, null when the server template is unset. */
  shareUrl: string | null | undefined;
  /** `localized_text` from the same payload. */
  localizedText: ReferralLocalizedText | undefined;
  /** Invoked once, after the close animation, whatever dismissed the sheet. */
  onClose: () => void;
}

/**
 * The referrer's share sheet, mounted inline by the referrer hero.
 *
 * It is presentational: every value it shows arrives as a prop, so the one
 * surface that owns a referral code is also the only thing that can mount it.
 * Dismissal is the parent's `onClose` rather than `goBack`, because the sheet
 * is not a route.
 */
const ShareCodeSheet: React.FC<ShareCodeSheetProps> = ({
  open,
  code,
  shareUrl,
  localizedText,
  onClose,
}) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sheetRef = useRef<BottomSheetRef>(null);
  const copy = useShareCopy(localizedText);
  const resolvedShareUrl = resolveMoneyShareUrl(code, shareUrl);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  // Every dismissal route — the header button, the overlay, a swipe, the
  // hardware back button — lands on the same sheet close, and the parent is
  // told once per opening.
  const hasReportedCloseRef = useRef(false);

  useEffect(() => {
    if (open) {
      setIsLinkCopied(false);
      hasReportedCloseRef.current = false;
    }
  }, [open]);

  const trackShare = useCallback(
    (shareMethod: RewardsReferralShareMethod) => {
      if (!code) {
        return;
      }
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_MONEY_REFERRAL_CODE_SHARED)
          .addProperties({
            referral_code: code,
            share_method: shareMethod,
          })
          .build(),
      );
    },
    [code, createEventBuilder, trackEvent],
  );

  const handleSheetClosed = useCallback(() => {
    if (hasReportedCloseRef.current) {
      return;
    }
    hasReportedCloseRef.current = true;
    onClose();
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleShareVia = useCallback(() => {
    if (!resolvedShareUrl) {
      return;
    }

    trackShare('share_via');
    const subject = strings('rewards.referral.actions.share_referral_subject');
    const shareContent =
      Platform.OS === 'ios'
        ? { message: subject, url: resolvedShareUrl }
        : { message: `${subject}\n${resolvedShareUrl}` };

    Share.share(shareContent).catch((error) => {
      Logger.log('Error while trying to share Money referral link', error);
    });
  }, [resolvedShareUrl, trackShare]);

  const handleCopyLink = useCallback(() => {
    if (!resolvedShareUrl) {
      return;
    }

    trackShare('copy_link');
    Clipboard.setString(resolvedShareUrl);
    setIsLinkCopied(true);
  }, [resolvedShareUrl, trackShare]);

  const handleMessages = useCallback(() => {
    if (!resolvedShareUrl) {
      return;
    }

    trackShare('messages');
    // The two platforms disagree on how a body is attached to an `sms:` URL:
    // iOS wants it as a second field (`&`), Android as the first query
    // parameter (`?`). The wrong separator opens an empty composer.
    const smsBody = buildShareSmsBody(copy.inviteBody, resolvedShareUrl);
    const encodedBody = encodeURIComponent(smsBody);
    const smsUrl =
      Platform.OS === 'ios'
        ? `sms:&body=${encodedBody}`
        : `sms:?body=${encodedBody}`;

    Linking.openURL(smsUrl).catch((error) => {
      Logger.log('Error while opening messages for Money referral link', error);
    });
  }, [copy.inviteBody, resolvedShareUrl, trackShare]);

  const handleTelegram = useCallback(() => {
    if (!resolvedShareUrl) {
      return;
    }

    trackShare('telegram');
    const inviteText = buildShareInviteText(copy.inviteBody);
    const telegramUrl = inviteText
      ? `https://t.me/share/url?url=${encodeURIComponent(resolvedShareUrl)}&text=${encodeURIComponent(inviteText)}`
      : `https://t.me/share/url?url=${encodeURIComponent(resolvedShareUrl)}`;

    Linking.openURL(telegramUrl).catch((error) => {
      Logger.log('Error while opening Telegram for Money referral link', error);
    });
  }, [copy.inviteBody, resolvedShareUrl, trackShare]);

  // Without a link there is nothing for these to act on, so they are left out
  // rather than shown inert.
  const actions = resolvedShareUrl
    ? [
        {
          key: 'shareVia',
          label: copy.shareVia,
          icon: IconName.Export,
          testID: SHARE_CODE_SHEET_TEST_IDS.SHARE_VIA,
          onPress: handleShareVia,
        },
        {
          key: 'copyLink',
          label: copy.copyLink,
          icon: isLinkCopied ? IconName.Confirmation : IconName.Copy,
          iconColor: isLinkCopied ? IconColor.SuccessDefault : undefined,
          testID: SHARE_CODE_SHEET_TEST_IDS.COPY_LINK,
          onPress: handleCopyLink,
        },
        {
          key: 'messages',
          label: copy.messages,
          icon: IconName.Messages,
          testID: SHARE_CODE_SHEET_TEST_IDS.MESSAGES,
          onPress: handleMessages,
        },
        {
          key: 'telegram',
          label: copy.telegram,
          icon: IconName.Send,
          testID: SHARE_CODE_SHEET_TEST_IDS.TELEGRAM,
          onPress: handleTelegram,
        },
      ].filter((action) => Boolean(action.label))
    : [];

  if (!open) {
    return null;
  }

  return (
    // BottomSheet lays itself out `absolute inset-0`, so it only covers its
    // parent. Rendered inline in the referrer hero it would sit inside that
    // card and the overlay would be clipped to it; a full-screen Modal gives it
    // the whole surface to dim. SafeAreaProvider re-measures insets for the
    // Modal's own window (Android) and GestureHandlerRootView keeps
    // swipe-to-dismiss working inside it.
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <BottomSheet
            ref={sheetRef}
            onClose={handleSheetClosed}
            testID={SHARE_CODE_SHEET_TEST_IDS.CONTAINER}
          >
            <BottomSheetHeader
              onClose={handleRequestClose}
              closeButtonProps={{ testID: SHARE_CODE_SHEET_TEST_IDS.CLOSE }}
            >
              {copy.title}
            </BottomSheetHeader>
            <Box alignItems={BoxAlignItems.Center} twClassName="px-4 pb-6">
              {resolvedShareUrl ? (
                // The graphic carries no information a screen reader can use;
                // the copy action does.
                <Box
                  twClassName="rounded-xl border border-muted bg-default p-3"
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  <QRCode
                    value={resolvedShareUrl}
                    size={QR_SIZE}
                    testID={SHARE_CODE_SHEET_TEST_IDS.QR}
                  />
                </Box>
              ) : null}
              {actions.length > 0 && (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  justifyContent={BoxJustifyContent.Center}
                  twClassName="mt-6 w-full gap-4"
                >
                  {actions.map((action) => (
                    <Pressable
                      key={action.key}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      onPress={action.onPress}
                      testID={action.testID}
                    >
                      {/*
                        The caption repeats the button's own label, so leaving
                        it visible to assistive tech has the action announced
                        twice. The label on the Pressable is the one that
                        describes it.
                      */}
                      <Box
                        alignItems={BoxAlignItems.Center}
                        twClassName="gap-2"
                        importantForAccessibility="no-hide-descendants"
                        accessibilityElementsHidden
                        testID={`${action.testID}-content`}
                      >
                        <Box
                          alignItems={BoxAlignItems.Center}
                          justifyContent={BoxJustifyContent.Center}
                          twClassName="h-12 w-12 rounded-full bg-muted"
                        >
                          <Icon
                            name={action.icon}
                            size={IconSize.Md}
                            color={
                              'iconColor' in action
                                ? action.iconColor
                                : undefined
                            }
                            testID={
                              action.key === 'copyLink' && isLinkCopied
                                ? SHARE_CODE_SHEET_TEST_IDS.COPY_LINK_CHECK
                                : undefined
                            }
                          />
                        </Box>
                        <Text variant={TextVariant.BodyXs}>{action.label}</Text>
                      </Box>
                    </Pressable>
                  ))}
                </Box>
              )}
            </Box>
          </BottomSheet>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default ShareCodeSheet;
