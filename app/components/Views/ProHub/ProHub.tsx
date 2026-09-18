import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  type RiveFile,
} from '@rive-app/react-native';
import { useFonts } from 'expo-font';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  IconName,
  SectionDivider,
  Text,
  toast,
  ToastSeverity,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { ProHubTestIds } from './ProHub.testIds';
import {
  MOCK_MEMBER_SINCE,
  MOCK_NEXT_PAYMENT,
  PRO_HUB_INTRO,
  proHubContentDelayMs,
} from './ProHub.constants';
import { useOrangeMembership } from '../shared/pro/useOrangeMembership';
import FadeInUp from './components/FadeInUp';
import Loader from '../../../component-library/components-temp/Loader';
import type { EntitlementAction } from '../shared/pro/entitlements.constants';
import {
  ORANGE_GRADIENT_COLORS,
  ORANGE_GRADIENT_END,
  ORANGE_GRADIENT_START,
} from '../shared/pro/brand.constants';
import Entitlements from './components/Entitlements';
import { useNativeHeader } from '../../hooks/useNativeHeader';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const OrangeIconAnimation = require('../../../animations/rewards_icon_animations.riv');

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const OswaldBold = require('../../../fonts/Oswald-Bold.ttf');

/*
 * Kept in step with the intro screen, which declares the same names — the icon
 * is the same brand asset, and the state machine's resting state is a static
 * greyed icon, so it needs its entry trigger firing to animate at all.
 */
const ORANGE_ICON_STATE_MACHINE_NAME = 'Rewards_Icon';
const ORANGE_ICON_START_TRIGGER = 'Start';
const ORANGE_ICON_SIZE = 96;

/* Oswald Bold, matching the intro's hero. See Benefits.tsx for why. */
const styles = StyleSheet.create({
  heroTitle: {
    fontFamily: 'Oswald-Bold',
  },
});

/**
 * The member's identity, and the first thing in the hub.
 *
 * Replaces a static METAMASK / Orange lockup that carried no state — it was a
 * logo rather than a card, so it said nothing about the person holding it.
 * "Member since" is the smallest piece of data that turns the top of the
 * screen from branding into something you own.
 */
const MembershipIdentity = ({
  testID,
  riveFile,
  memberSince,
}: {
  testID: string;
  /** `undefined` while loading, `null` if the file failed to load. */
  riveFile: RiveFile | null | undefined;
  memberSince: string;
}) => {
  const { riveViewRef, setHybridRef: setRiveHybridRef } = useRive();

  /*
   * `riveViewRef` is non-null only once the native view has resolved, so
   * gating on it both waits for readiness and retries a missed trigger.
   */
  useEffect(() => {
    if (!riveViewRef) {
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      riveViewRef.triggerInput(ORANGE_ICON_START_TRIGGER);
    } catch {
      // Ornamental only — a failed trigger just leaves the static frame.
    }
  }, [riveViewRef]);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      twClassName="w-full gap-y-1 pt-2 pb-2"
      testID={testID}
    >
      {/* Ornamental, so there is no non-Rive fallback. */}
      {riveFile ? (
        <RiveView
          hybridRef={setRiveHybridRef}
          file={riveFile}
          stateMachineName={ORANGE_ICON_STATE_MACHINE_NAME}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={{ width: ORANGE_ICON_SIZE, height: ORANGE_ICON_SIZE }}
        />
      ) : null}

      {/* Held back until the icon has played through one rotation. */}
      <FadeInUp
        delayMs={proHubContentDelayMs()}
        durationMs={PRO_HUB_INTRO.ELEMENT_MS}
        travel={PRO_HUB_INTRO.TRAVEL}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-y-1">
          <Text
            variant={TextVariant.DisplayLg}
            color={TextColor.TextDefault}
            style={styles.heroTitle}
          >
            {strings('pro_hub.membership_label')}
          </Text>

          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('pro_hub.member_since', { date: memberSince })}
          </Text>
        </Box>
      </FadeInUp>
    </Box>
  );
};

const ProHub = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  /* Falls back to the mock date when reached without a recorded join. */
  const { memberSince } = useOrangeMembership();

  /*
   * Both assets are loaded here, at the screen, rather than inside the identity
   * block — the entrance sequence runs on fixed delays from mount, so if the
   * content mounted before the Rive file and Oswald had arrived the cascade
   * would play to completion and the icon would pop in afterwards. Holding the
   * whole view until they resolve means the sequence starts from a point where
   * everything it animates actually exists.
   */
  const { riveFile, error: riveError } = useRiveFile(OrangeIconAnimation);
  /* Registers Oswald with the OS at runtime so it resolves without a rebuild. */
  const [areFontsLoaded, fontError] = useFonts({ 'Oswald-Bold': OswaldBold });

  /*
   * "Resolved" rather than "loaded": each asset is done when it has either
   * arrived or definitively failed, so a failure proceeds immediately instead
   * of waiting out the failsafe below. `useRiveFile` reports `undefined` while
   * loading and `null` on error, so the absence of a file is not by itself a
   * finished state.
   */
  const isRiveResolved = riveFile !== undefined || Boolean(riveError);
  const areFontsResolved = areFontsLoaded || Boolean(fontError);

  /*
   * Failsafe only. In development the font and the .riv are fetched from Metro
   * over HTTP, which on a cold bundle can take several seconds — long enough
   * that a short timeout would fire first and render the view without Oswald,
   * which is exactly the snap this gate exists to prevent. In release builds
   * both ship inside the binary and resolve immediately.
   */
  const [hasWaitLapsed, setHasWaitLapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => setHasWaitLapsed(true),
      PRO_HUB_INTRO.ASSET_WAIT_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  const isReady = (isRiveResolved && areFontsResolved) || hasWaitLapsed;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleManageMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP);
  }, [navigation]);

  const handleEntitlementAction = useCallback(
    (action: EntitlementAction) => {
      if (action === 'card') {
        navigation.navigate(Routes.CARD.ROOT);
        return;
      }
      /*
       * Applying an alternate app icon needs native work, so this confirms
       * the intent rather than claiming the icon changed. `<Toaster />` is
       * already mounted app-wide in App.tsx inside a FullWindowOverlay, so
       * the imperative `toast()` needs no host of its own here.
       */
      if (action === 'app_icon') {
        toast({
          severity: ToastSeverity.Success,
          title: strings('pro_hub.entitlements.app_icon.toast_title'),
          description: strings(
            'pro_hub.entitlements.app_icon.toast_description',
          ),
        });
      }
      // `support` still has no destination, so nothing declares it an action.
    },
    [navigation],
  );

  const isNativeHeaderEnabled = useNativeHeader({
    title: '',
  });

  return (
    /*
     * Gradient at the container so it sits behind the toolbar too, matching the
     * upsell — the member crosses from one to the other in a single flow, and a
     * background change at that boundary would break it in two.
     */
    <LinearGradient
      colors={ORANGE_GRADIENT_COLORS}
      start={ORANGE_GRADIENT_START}
      end={ORANGE_GRADIENT_END}
      style={tw.style('flex-1')}
    >
      <SafeAreaView
        style={tw.style('flex-1')}
        edges={isNativeHeaderEnabled ? ['bottom'] : ['top', 'bottom']}
        testID={ProHubTestIds.CONTAINER}
      >
        {!isNativeHeaderEnabled && (
          <HeaderBase
            testID={ProHubTestIds.HEADER_ROOT}
            twClassName="px-4"
            startAccessory={
              <ButtonIcon
                iconName={IconName.ArrowLeft}
                onPress={handleBack}
                accessibilityLabel={strings('navigation.back')}
                testID={ProHubTestIds.BACK_BUTTON}
              />
            }
          />
        )}

        {!isReady ? (
          <Box twClassName="flex-1 items-center justify-center">
            <Loader />
          </Box>
        ) : (
          <ScrollView
            contentInsetAdjustmentBehavior={
              isNativeHeaderEnabled ? 'automatic' : undefined
            }
            contentContainerStyle={tw.style('px-4 pt-2 pb-10')}
            showsVerticalScrollIndicator={false}
          >
            <Box twClassName="w-full mb-4">
              <MembershipIdentity
                testID={ProHubTestIds.MEMBERSHIP_BANNER}
                riveFile={riveFile}
                memberSince={memberSince ?? MOCK_MEMBER_SINCE}
              />
            </Box>

            {/*
              Lifetime earnings used to lead here. It was removed: two of its three
              figures are already stated by the benefit rows below — Money balance
              earnings by Boosted APY, mUSD back by Card cashback — and the
              remaining lifetime total is near zero for anyone who has just joined,
              so it made a weak hero out of a duplicate. The cumulative value story
              belongs in the Earned screen's "paid for itself" framing instead.
            */}
            <Entitlements
              onAction={handleEntitlementAction}
              startDelayMs={
                proHubContentDelayMs() + PRO_HUB_INTRO.ELEMENT_STAGGER_MS
              }
            />

            <SectionDivider marginVertical={6} />

            <Box
              testID={ProHubTestIds.MEMBERSHIP_SECTION}
              twClassName="gap-y-4"
            >
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {strings('pro_hub.membership_section_title')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={ProHubTestIds.NEXT_PAYMENT_TEXT}
              >
                {strings('pro_hub.next_payment', {
                  amount: MOCK_NEXT_PAYMENT.amount,
                  date: MOCK_NEXT_PAYMENT.date,
                })}
              </Text>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                onPress={handleManageMembership}
                isFullWidth
                testID={ProHubTestIds.MANAGE_BUTTON}
              >
                {strings('pro_hub.manage_plan')}
              </Button>
            </Box>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ProHub;
