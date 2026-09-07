import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
} from '@rive-app/react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import {
  BENEFITS,
  DEFAULT_PLAN,
  type BenefitDetailItem,
  type PlanId,
  BENEFIT_DETAILS,
} from './Benefits.constants';
import { BenefitsTestIds } from './Benefits.testIds';
import { BenefitRow } from '../../../shared/pro';
import BenefitDetails from './components/BenefitDetails';
import FadeSlideIn from './components/FadeSlideIn';
import OrangeGradientButton from './components/OrangeGradientButton';
import { useFonts } from 'expo-font';
import { strings } from '../../../../../../locales/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const OrangeIconAnimation = require('../../../../../animations/rewards_icon_animations.riv');

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const OswaldBold = require('../../../../../fonts/Oswald-Bold.ttf');

/*
 * Runtime-facing name from the .riv file. Declared locally rather than
 * imported from the Rewards feature so this route does not depend on another
 * feature's internals — the trade-off is that it must be kept in step with
 * the file if the state machine is ever renamed.
 */
const ORANGE_ICON_STATE_MACHINE_NAME = 'Rewards_Icon';
/*
 * The state machine's resting state is a static (greyed) icon — it animates
 * only when a trigger fires, so `autoPlay` alone renders a still frame. This
 * is the file's own entry trigger.
 */
const ORANGE_ICON_START_TRIGGER = 'Start';
const ORANGE_ICON_SIZE = 96;

/*
 * Entrance sequence timings. All tunable from here.
 *
 * `RIVE_SEQUENCE_MS` is how long the icon holds centre-screen before it
 * travels up. It is a fixed guess rather than a real completion signal: a
 * `.riv` is a binary we cannot introspect, and this file exposes no
 * state-machine event for us to hand off from. Dial it in on device; if the
 * file later emits a completion event, drive the handoff from that instead.
 */
const INTRO = {
  RIVE_SEQUENCE_MS: 1100,
  RIVE_SETTLE_MS: 520,
  ROW_STAGGER_MS: 90,
  ELEMENT_MS: 370,
  CTA_MS: 380,
  /** Beat between the icon settling and the content starting to arrive. */
  POST_SETTLE_MS: 140,
  /** Fade the icon in once measured, to avoid a frame at its resting spot. */
  RIVE_REVEAL_MS: 180,
} as const;

/*
 * Hero title in Oswald Bold — part of the new brand. MMPoly is being moved
 * away from, so it is deliberately not used here.
 *
 * `Oswald-Bold` is the font's PostScript name, which is what iOS matches on
 * (consistent with how Geist and MMPoly are referenced elsewhere).
 *
 * The font is registered at runtime with `expo-font` so it resolves in the
 * current dev client. Native registration (`UIAppFonts` in Info.plist plus the
 * Android assets) is also in place for real builds, where the font ships
 * inside the binary — runtime loading is only what avoids a rebuild here.
 */
const styles = StyleSheet.create({
  heroTitle: {
    fontFamily: 'Oswald-Bold',
  },
});

interface BenefitsProps {
  onSuccess: () => void;
  initialPlan?: PlanId;
}

const Benefits = ({ onSuccess, initialPlan }: BenefitsProps) => {
  /*
   * Fixed rather than stateful now the interval selector is gone. It still
   * selects the plan-specific subtitle copy (`subtitleMonthly`) and is passed
   * to the detail sheet; `initialPlan` from the caller still wins.
   */
  const selectedPlan: string = initialPlan ?? DEFAULT_PLAN;

  /*
   * Registers Oswald with the OS at runtime, so it resolves without being
   * compiled into the binary. The title falls back to the system face until
   * this settles — masked in practice by the intro sequence, which does not
   * reveal the title for over a second.
   */
  useFonts({ 'Oswald-Bold': OswaldBold });

  const reduceMotion = useReducedMotion();

  /*
   * The icon starts centred in the viewport and travels to its resting slot.
   * Rather than absolutely positioning it and animating to a layout position,
   * it stays in its final slot and is pushed *down* by the distance to the
   * viewport centre, then that offset animates to zero — so layout never
   * changes and nothing reflows mid-sequence.
   */
  const [viewportHeight, setViewportHeight] = useState(0);
  const [riveSlot, setRiveSlot] = useState<{ y: number; height: number }>();

  const centreTravel = useMemo(() => {
    if (!viewportHeight || !riveSlot) {
      return 0;
    }
    return Math.max(0, (viewportHeight - riveSlot.height) / 2 - riveSlot.y);
  }, [viewportHeight, riveSlot]);

  const hasMeasured = Boolean(viewportHeight && riveSlot);

  const riveTravel = useSharedValue(0);
  const riveReveal = useSharedValue(0);

  useEffect(() => {
    if (!hasMeasured) {
      return;
    }
    if (reduceMotion) {
      riveTravel.value = 0;
      riveReveal.value = 1;
      return;
    }
    // Start centred, hold for the sequence, then travel to the resting slot.
    riveTravel.value = centreTravel;
    riveTravel.value = withDelay(
      INTRO.RIVE_SEQUENCE_MS,
      withTiming(0, {
        duration: INTRO.RIVE_SETTLE_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
    riveReveal.value = withTiming(1, { duration: INTRO.RIVE_REVEAL_MS });
  }, [hasMeasured, centreTravel, reduceMotion, riveTravel, riveReveal]);

  const riveStyle = useAnimatedStyle(() => ({
    opacity: riveReveal.value,
    transform: [{ translateY: riveTravel.value }],
  }));

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const handleRiveLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setRiveSlot((current) =>
      current?.y === y && current?.height === height ? current : { y, height },
    );
  }, []);

  /*
   * Content waits until the icon has fully settled, plus a short beat.
   * It previously started at 35% through the travel so the two would read as
   * one gesture, but that overlapped the title with the moving icon.
   */
  const headerDelayMs =
    INTRO.RIVE_SEQUENCE_MS + INTRO.RIVE_SETTLE_MS + INTRO.POST_SETTLE_MS;
  const ctaDelayMs =
    headerDelayMs + INTRO.ROW_STAGGER_MS * (BENEFITS.length + 1);

  const { riveFile } = useRiveFile(OrangeIconAnimation);
  const { riveViewRef, setHybridRef: setRiveHybridRef } = useRive();

  /*
   * `riveViewRef` is non-null only once the native view has resolved, so
   * gating the effect on it both waits for readiness and retries if the
   * trigger would otherwise have been missed.
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

  const [isBenefitDetailSheetOpen, setIsBenefitDetailSheetOpen] =
    useState(false);
  const [selectedBenfitDetail, setSelectedBenfitDetail] =
    useState<BenefitDetailItem | null>(null);

  const handleBenefitPress = useCallback((id: string) => {
    setIsBenefitDetailSheetOpen(true);
    setSelectedBenfitDetail(
      BENEFIT_DETAILS.find((detail) => detail.id === id) ?? null,
    );
  }, []);

  const handleBenefitDetailSheetClose = useCallback(() => {
    setIsBenefitDetailSheetOpen(false);
  }, []);

  return (
    <Box
      twClassName="flex-1"
      testID={BenefitsTestIds.CONTAINER}
      onLayout={handleViewportLayout}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/*
          Decorative brand animation. Purely ornamental, so there is no
          non-Rive fallback: if the file fails to load the view simply starts
          at the title.
        */}
        {riveFile && (
          <Animated.View
            onLayout={handleRiveLayout}
            style={riveStyle}
            testID={BenefitsTestIds.HEADER_ANIMATION}
          >
            <Box alignItems={BoxAlignItems.Center} twClassName="pt-2 pb-2">
              <RiveView
                hybridRef={setRiveHybridRef}
                file={riveFile}
                stateMachineName={ORANGE_ICON_STATE_MACHINE_NAME}
                autoPlay
                fit={Fit.Contain}
                alignment={Alignment.Center}
                style={{
                  width: ORANGE_ICON_SIZE,
                  height: ORANGE_ICON_SIZE,
                }}
              />
            </Box>
          </Animated.View>
        )}

        {/*
          Header — inside the ScrollView by design. It previously sat as a
          sibling above it, which pinned the title and subtitle while only the
          bullets moved. The plan selector below stays pinned deliberately: it
          is the purchase CTA.
        */}
        <FadeSlideIn delayMs={headerDelayMs} durationMs={INTRO.ELEMENT_MS}>
          <Box twClassName="px-4 pt-2 pb-6">
            <Text
              variant={TextVariant.DisplayLg}
              twClassName="mb-2"
              style={styles.heroTitle}
              testID={BenefitsTestIds.TITLE}
            >
              {strings('pro_subscription.title')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2 flex-wrap"
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                testID={BenefitsTestIds.PRICE_LINE}
              >
                {strings('pro_subscription.description')}
              </Text>
            </Box>
          </Box>
        </FadeSlideIn>

        {/* Benefits list */}
        <Box twClassName="px-4 pb-2">
          {BENEFITS.map((item, index) => (
            <FadeSlideIn
              key={item.id}
              delayMs={headerDelayMs + INTRO.ROW_STAGGER_MS * (index + 1)}
              durationMs={INTRO.ELEMENT_MS}
            >
              <BenefitRow
                item={item}
                onPress={
                  item.hasDetail ? () => handleBenefitPress(item.id) : undefined
                }
                selectedPlan={selectedPlan}
              />
            </FadeSlideIn>
          ))}
        </Box>
      </ScrollView>

      {/*
        Anchored CTA only. The interval selector was removed deliberately: this
        view sells the benefits, and the monthly/annual decision belongs later
        in the funnel (MMPay setup) rather than being forced here.
      */}
      <FadeSlideIn
        delayMs={ctaDelayMs}
        durationMs={INTRO.CTA_MS}
        fromTranslateY={64}
      >
        <Box twClassName="px-4 pt-3 pb-2 border-t border-border-muted">
          <OrangeGradientButton
            label={strings('pro_subscription.join_pro')}
            onPress={onSuccess}
            testID={BenefitsTestIds.CTA_BUTTON}
          />
        </Box>
      </FadeSlideIn>

      {isBenefitDetailSheetOpen && selectedBenfitDetail && (
        <BenefitDetails
          onClose={handleBenefitDetailSheetClose}
          details={selectedBenfitDetail}
          selectedPlan={selectedPlan}
        />
      )}
    </Box>
  );
};

export default Benefits;
