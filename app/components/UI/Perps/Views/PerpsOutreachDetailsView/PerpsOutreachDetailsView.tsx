import React, { useCallback, useMemo, useRef } from 'react';
import { Image, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonSize,
  ButtonsAlignment,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { usePerpsOutreachBanner } from '../../hooks/usePerpsOutreachBanner';
import { PerpsOutreachDetailsViewSelectorsIDs } from './PerpsOutreachDetailsView.testIds';

// eslint-disable-next-line import-x/no-commonjs, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const outreachFoxImage = require('../../../../../images/perps-outreach-banner.png');

interface FeatureRowProps {
  iconName: IconName;
  title: string;
  subtitle?: string;
  testID: string;
}

const FeatureRow = ({ iconName, title, subtitle, testID }: FeatureRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    gap={4}
    twClassName="py-2"
    testID={testID}
  >
    <Icon
      name={iconName}
      size={IconSize.Md}
      twClassName="mt-0.5 text-icon-default"
    />
    <Box twClassName="min-w-0 flex-1 gap-0.5">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {subtitle}
        </Text>
      ) : null}
    </Box>
  </Box>
);

/**
 * Perps outreach details bottom sheet.
 *
 * Opened via the `perps-outreach` deeplink (see
 * `handlePerpsOutreachUrl`) — the mobile client wires the sheet to
 * `Routes.PERPS.MODALS.OUTREACH_DETAILS` inside the Perps modal stack, and
 * the banner's `banner.linkUrl` from `/v1/outreach` routes here through
 * `SharedDeeplinkManager`.
 *
 * The copy and illustration are static for this design-specific sheet. Contact
 * destinations come from the campaign response so Terminal can update them
 * without a mobile release.
 */
const PerpsOutreachDetailsView = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { data: campaign } = usePerpsOutreachBanner();
  const contact = campaign?.contact ?? null;
  const email = contact?.email;
  const telegramUsername = contact?.telegramUsername;
  const calendlyUrl = contact?.calendlyUrl;
  const telegramUrl = telegramUsername
    ? `https://t.me/${telegramUsername.replace(/^@/, '')}`
    : null;

  // The screen is registered inside `PerpsModalStack`, which is presented as
  // a transparent modal. Pass `goBack` to the DSRN `BottomSheet` so swipe /
  // overlay-tap / hardware-back all pop just the modal. Do NOT also call
  // `navigation.goBack()` from an `onCloseBottomSheet` callback — the sheet
  // already invokes `goBack` in `onCloseCB`, and a second pop would leave
  // the Perps page underneath (e.g. Market Details → Home).
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    // Header X: animate the sheet closed; BottomSheet's `goBack` prop then
    // pops the modal. No extra callback — that would double-pop.
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  /**
   * Open a web URL in the built-in browser tab rather than kicking the user
   * out to Safari/Chrome. Mirrors the pattern used by `PerpsTutorialCarousel`
   * for its "Learn more" CTA. `mailto:` and other non-http(s) schemes must
   * still go through `Linking.openURL` — the in-app browser only speaks web.
   *
   * Sequence: sheet close animation → BottomSheet `goBack` pops the
   * transparent modal → navigate to the browser tab. The post-callback must
   * NOT call `goBack` again; the sheet already does that before invoking it.
   */
  const openInAppBrowser = useCallback(
    (url: string) => {
      sheetRef.current?.onCloseBottomSheet(() => {
        navigation.navigate(Routes.BROWSER.HOME, {
          screen: Routes.BROWSER.VIEW,
          params: {
            newTabUrl: url,
            linkType: EXTERNAL_LINK_TYPE,
            timestamp: Date.now(),
          },
        });
      });
    },
    [navigation],
  );

  const handleTelegramPress = useCallback(() => {
    if (!telegramUrl) {
      return;
    }
    // Open externally on purpose: iOS/Android Universal Link routing (t.me →
    // Telegram app) is only honored by the OS launcher, not inside a WebView.
    // Routing through the in-app browser would land users on the t.me web
    // fallback and force a second tap on "Open in Telegram" (which then hits
    // MetaMask's "unsupported protocol" alert because `tg:` isn't allowlisted
    // in `app/util/browser/index.ts`).
    Linking.openURL(telegramUrl).catch(() => undefined);
  }, [telegramUrl]);

  const handleSchedulePress = useCallback(() => {
    if (!calendlyUrl) {
      return;
    }
    // Calendly renders cleanly inside the WebView, so keep the user in-app.
    openInAppBrowser(calendlyUrl);
  }, [calendlyUrl, openInAppBrowser]);

  const handleEmailPress = useCallback(() => {
    if (!email) {
      return;
    }
    // mailto: has to leave the app — the in-app browser is web-only.
    Linking.openURL(`mailto:${email}`).catch(() => undefined);
  }, [email]);

  // One `strings()` call so translators can place both the handle and the
  // address anywhere in the sentence. The address is split back out of the
  // translated copy to render it as the pressable mailto link in place.
  const contactCopy = useMemo(() => {
    if (!email) {
      return null;
    }

    const sentence = strings('perps.outreach_details.contact', {
      telegramHandle: telegramUsername,
      email,
    });
    const [before, ...rest] = sentence.split(email);

    return { before, after: rest.join(email) };
  }, [email, telegramUsername]);

  const secondaryButtonProps = useMemo(
    () => ({
      children: strings('perps.outreach_details.telegram_button'),
      onPress: handleTelegramPress,
      size: ButtonSize.Lg,
      testID: PerpsOutreachDetailsViewSelectorsIDs.TELEGRAM_BUTTON,
    }),
    [handleTelegramPress],
  );

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.outreach_details.schedule_button'),
      onPress: handleSchedulePress,
      size: ButtonSize.Lg,
      testID: PerpsOutreachDetailsViewSelectorsIDs.SCHEDULE_BUTTON,
    }),
    [handleSchedulePress],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      // Invoked once by DSRN on every close path (header X via
      // onCloseBottomSheet, swipe, overlay tap, hardware back). That single
      // pop dismisses only the transparent modal and leaves the Perps page
      // the user opened the banner from underneath.
      goBack={handleGoBack}
      testID={PerpsOutreachDetailsViewSelectorsIDs.SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PerpsOutreachDetailsViewSelectorsIDs.CLOSE_BUTTON,
        }}
      />

      <Box alignItems={BoxAlignItems.Center} twClassName="px-4 pb-4">
        <Image
          source={outreachFoxImage}
          resizeMode="contain"
          // Rounded so a future opaque illustration keeps the same silhouette
          // as the transparent one used today.
          style={tw.style('h-20 w-20 rounded-2xl')}
          accessibilityIgnoresInvertColors
        />

        <Text
          variant={TextVariant.HeadingLg}
          twClassName="mt-4 text-center"
          testID={PerpsOutreachDetailsViewSelectorsIDs.TITLE}
        >
          {strings('perps.outreach_details.title')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
          testID={PerpsOutreachDetailsViewSelectorsIDs.BODY}
        >
          {strings('perps.outreach_details.subtitle')}
        </Text>

        <Box twClassName="mt-6 w-full gap-1">
          <FeatureRow
            iconName={IconName.Trophy}
            title={strings('perps.outreach_details.features.vip.title')}
            subtitle={strings('perps.outreach_details.features.vip.subtitle')}
            testID={PerpsOutreachDetailsViewSelectorsIDs.FEATURE_VIP}
          />
          <FeatureRow
            iconName={IconName.Messages}
            title={strings('perps.outreach_details.features.support.title')}
            subtitle={strings(
              'perps.outreach_details.features.support.subtitle',
            )}
            testID={PerpsOutreachDetailsViewSelectorsIDs.FEATURE_SUPPORT}
          />
          <FeatureRow
            iconName={IconName.Rocket}
            title={strings('perps.outreach_details.features.roadmap.title')}
            subtitle={strings(
              'perps.outreach_details.features.roadmap.subtitle',
            )}
            testID={PerpsOutreachDetailsViewSelectorsIDs.FEATURE_ROADMAP}
          />
          <FeatureRow
            iconName={IconName.Global}
            title={strings('perps.outreach_details.features.trip.title')}
            subtitle={strings('perps.outreach_details.features.trip.subtitle')}
            testID={PerpsOutreachDetailsViewSelectorsIDs.FEATURE_TRIP}
          />
        </Box>

        {contactCopy ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-6 text-center"
            testID={PerpsOutreachDetailsViewSelectorsIDs.CONTACT_TEXT}
          >
            {contactCopy.before}
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.PrimaryDefault}
              twClassName="underline"
              onPress={handleEmailPress}
              testID={PerpsOutreachDetailsViewSelectorsIDs.CONTACT_EMAIL}
            >
              {email}
            </Text>
            {contactCopy.after}
          </Text>
        ) : null}
      </Box>

      {contact ? (
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          secondaryButtonProps={secondaryButtonProps}
          primaryButtonProps={primaryButtonProps}
        />
      ) : null}
    </BottomSheet>
  );
};

export default PerpsOutreachDetailsView;
