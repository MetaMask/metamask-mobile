import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MarketingMomentTitle from '../../../MarketingMomentTitle';
import { useReduceMotionState } from '../../../Money/hooks/useReduceMotion';
import CompleteCheckAnimation from './CompleteCheckAnimation';
import { CompleteSelectors } from './Complete.testIds';

// -- Content cascade ---------------------------------------------------------
// Once the tick starts drawing, the title, description and button each fade in
// and rise into place, one after another. Under Reduce Motion they show at once.

/** How far each item rises into place. */
const CASCADE_RISE_PX = 10;
/** Delay after the tick starts before the title enters, so it lands mid-draw. */
const CASCADE_LEAD_MS = AnimationDuration.Regularly;
/** Gap between each item starting. */
const CASCADE_STAGGER_MS = 80;
/** How long each item takes to enter. */
const CASCADE_DURATION_MS = AnimationDuration.Regularly;
/**
 * Cap on waiting for the tick to start. The Rive file load and the native
 * view-ready handshake are both unbounded, and the copy must never wait on them.
 */
export const COMPLETE_ENTRANCE_START_TIMEOUT_MS = 2000;

type CascadeState = 'pending' | 'play' | 'static';

const useCascadeStyle = (step: number, state: CascadeState) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (state === 'static') {
      progress.value = 1;
      return;
    }
    if (state === 'play') {
      progress.value = withDelay(
        CASCADE_LEAD_MS + step * CASCADE_STAGGER_MS,
        withTiming(1, {
          duration: CASCADE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [progress, state, step]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * CASCADE_RISE_PX }],
  }));
};

interface CardVerifiedContentProps {
  /** Continue is the only exit. The caller decides where it goes. */
  onContinue: () => void;
  /** Disables the button while the caller is navigating. */
  isLoading?: boolean;
}

/**
 * "You're verified" body: the Rive tick, staggered title and description, and
 * the pinned Finish setup button. Shared by the Baanx Complete screen and the
 * Immersve KYC result, which swaps this in without leaving the screen.
 * No tracking and no navigation — callers own both.
 */
const CardVerifiedContent = ({
  onContinue,
  isLoading = false,
}: CardVerifiedContentProps) => {
  const tw = useTailwind();
  // `null` while the Reduce Motion check is in flight; nothing animates or
  // shows until it resolves, so the first paint never flashes.
  const reduceMotion = useReduceMotionState();
  const [hasEntranceStarted, setHasEntranceStarted] = useState(false);
  const startEntrance = useCallback(() => setHasEntranceStarted(true), []);

  let cascadeState: CascadeState = 'pending';
  if (reduceMotion === true) {
    cascadeState = 'static';
  } else if (reduceMotion === false && hasEntranceStarted) {
    cascadeState = 'play';
  }
  const titleStyle = useCascadeStyle(0, cascadeState);
  const descriptionStyle = useCascadeStyle(1, cascadeState);
  const buttonStyle = useCascadeStyle(2, cascadeState);

  // A view at zero opacity still takes taps, so the button only becomes
  // pressable once its fade-in starts (straight away under Reduce Motion).
  const [isButtonInteractive, setIsButtonInteractive] = useState(false);
  useEffect(() => {
    if (cascadeState === 'static') {
      setIsButtonInteractive(true);
      return undefined;
    }
    if (cascadeState !== 'play') {
      return undefined;
    }
    const timeout = setTimeout(
      () => setIsButtonInteractive(true),
      CASCADE_LEAD_MS + 2 * CASCADE_STAGGER_MS,
    );
    return () => clearTimeout(timeout);
  }, [cascadeState]);

  let checkMode: 'pending' | 'animate' | 'static' = 'pending';
  if (reduceMotion === true) {
    checkMode = 'static';
  } else if (reduceMotion === false) {
    checkMode = 'animate';
  }

  useEffect(() => {
    if (reduceMotion !== false || hasEntranceStarted) {
      return undefined;
    }
    const timeout = setTimeout(
      startEntrance,
      COMPLETE_ENTRANCE_START_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [reduceMotion, hasEntranceStarted, startEntrance]);

  return (
    <View style={tw.style('flex-1')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
      >
        <TitleStandard
          title={
            <Animated.View style={[tw.style('w-full'), titleStyle]}>
              <MarketingMomentTitle
                twClassName="w-full text-center"
                testID={CompleteSelectors.TITLE}
              >
                {strings('card.card_onboarding.complete.title')}
              </MarketingMomentTitle>
            </Animated.View>
          }
          bottomLabel={
            <Animated.View style={[tw.style('w-full'), descriptionStyle]}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="text-center"
                testID={CompleteSelectors.DESCRIPTION}
              >
                {strings('card.card_onboarding.complete.description')}
              </Text>
            </Animated.View>
          }
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.End}
              twClassName="mb-5 w-full"
              testID={CompleteSelectors.IMAGE}
            >
              <CompleteCheckAnimation
                mode={checkMode}
                onEntranceStart={startEntrance}
                onRiveError={startEntrance}
              />
            </Box>
          }
        />
      </ScrollView>
      <Animated.View
        style={buttonStyle}
        pointerEvents={isButtonInteractive ? 'auto' : 'none'}
        testID={CompleteSelectors.FOOTER}
      >
        <Box twClassName="gap-2 px-4 pb-2 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={onContinue}
            isFullWidth
            isDisabled={isLoading}
            isLoading={isLoading}
            testID={CompleteSelectors.CONFIRM_BUTTON}
          >
            {strings('card.card_onboarding.complete.confirm_button')}
          </Button>
        </Box>
      </Animated.View>
    </View>
  );
};

export default CardVerifiedContent;
