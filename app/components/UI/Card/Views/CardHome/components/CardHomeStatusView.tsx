import React, { useEffect, useState } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import MarketingMomentTitle from '../../../../MarketingMomentTitle';
import { useReduceMotionState } from '../../../../Money/hooks/useReduceMotion';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import type { CardHomeWaitingStep } from '../hooks/CardHomeWaitingState';

export const CardHomeStatusViewSelectors = {
  CONTAINER: 'card-home-status-view',
  ASSET: 'card-home-status-view-asset',
  TITLE: 'card-home-status-view-title',
  DESCRIPTION: 'card-home-status-view-description',
  FOOTER: 'card-home-status-view-footer',
  PRIMARY_BUTTON: 'card-home-status-view-primary-button',
};

// -- Content cascade ---------------------------------------------------------
// Same entrance as the Card "You're in!" screen (Onboarding/Complete): the
// asset, title, description and button each fade in and rise into place, one
// after another. Under Reduce Motion they show at once.

/** How far each item rises into place. */
const CASCADE_RISE_PX = 10;
/** Gap between each item starting. */
const CASCADE_STAGGER_MS = 80;
/** How long each item takes to enter. */
const CASCADE_DURATION_MS = AnimationDuration.Regularly;
/** Cascade step of the footer button (asset 0, title 1, description 2). */
const BUTTON_STEP = 3;

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
        step * CASCADE_STAGGER_MS,
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

export interface CardHomeStatusViewButton {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface CardHomeStatusViewProps {
  /** Centred visual above the title, e.g. the card art. */
  asset: React.ReactNode;
  title: string;
  description: string;
  /** Full-width primary Lg button pinned to the bottom. */
  primaryButton: CardHomeStatusViewButton;
  /** Optional pull-to-refresh, e.g. to re-check a pending card. */
  refreshControl?: ScrollViewProps['refreshControl'];
  testID?: string;
}

/**
 * Focused Card home status layout for states with nothing to manage yet
 * (identity in review, card being created, card not turned on). Mirrors the
 * Card "You're in!" / VBA Identity verified pattern: title and description
 * at the top, the asset centred in the space below them, and one primary
 * button pinned at the bottom. The parent screen owns the header and the
 * safe-area edges.
 */
const CardHomeStatusView = ({
  asset,
  title,
  description,
  primaryButton,
  refreshControl,
  testID = CardHomeStatusViewSelectors.CONTAINER,
}: CardHomeStatusViewProps) => {
  const tw = useTailwind();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  // `null` while the Reduce Motion check is in flight; nothing shows until it
  // resolves, so the first paint never flashes.
  const reduceMotion = useReduceMotionState();
  // Offline: no entrance, on every hardware tier (unknown hardware included).
  // A low-end phone on a slow cell connection skips it too. An unknown
  // network keeps the entrance; it is not offline.
  const suppressEntrance =
    networkTier === 'NONE' ||
    (hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');

  let cascadeState: CascadeState = 'pending';
  if (reduceMotion === true || (reduceMotion === false && suppressEntrance)) {
    cascadeState = 'static';
  } else if (reduceMotion === false) {
    cascadeState = 'play';
  }
  const assetStyle = useCascadeStyle(0, cascadeState);
  const titleStyle = useCascadeStyle(1, cascadeState);
  const descriptionStyle = useCascadeStyle(2, cascadeState);
  const buttonStyle = useCascadeStyle(BUTTON_STEP, cascadeState);

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
      BUTTON_STEP * CASCADE_STAGGER_MS,
    );
    return () => clearTimeout(timeout);
  }, [cascadeState]);

  return (
    <Box twClassName="flex-1" testID={testID}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-6')}
        showsVerticalScrollIndicator={false}
        // Bounce is needed for pull-to-refresh to be reachable.
        alwaysBounceVertical={Boolean(refreshControl)}
        refreshControl={refreshControl}
      >
        <TitleStandard
          title={
            <Animated.View style={[tw.style('w-full'), titleStyle]}>
              <MarketingMomentTitle
                twClassName="w-full text-center"
                testID={CardHomeStatusViewSelectors.TITLE}
              >
                {title}
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
                testID={CardHomeStatusViewSelectors.DESCRIPTION}
              >
                {description}
              </Text>
            </Animated.View>
          }
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
        />
        {/* The card art fills the space between the copy and the footer, so
        it sits centred in the middle of the screen below the copy. */}
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          testID={CardHomeStatusViewSelectors.ASSET}
        >
          <Animated.View style={[tw.style('w-full'), assetStyle]}>
            {asset}
          </Animated.View>
        </Box>
      </ScrollView>
      <Animated.View
        style={buttonStyle}
        pointerEvents={isButtonInteractive ? 'auto' : 'none'}
        testID={CardHomeStatusViewSelectors.FOOTER}
      >
        <Box twClassName="gap-2 px-4 pb-2 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={primaryButton.onPress}
            testID={
              primaryButton.testID ?? CardHomeStatusViewSelectors.PRIMARY_BUTTON
            }
          >
            {primaryButton.label}
          </Button>
        </Box>
      </Animated.View>
    </Box>
  );
};

export default CardHomeStatusView;

/**
 * Per-state copy for the waiting view, keyed by the resolver's waiting
 * steps. The Immersve review uses the identity-review copy. The in-flight
 * reconcile check does not use the creating copy: that flash is what made
 * "Creating your card" appear before the check had resolved. Its map entry
 * is the neutral fallback; `resolveCardHomeWaitingCopyStep` prefers the last
 * settled step when there is one.
 */
export const CARD_HOME_WAITING_COPY: Record<
  CardHomeWaitingStep,
  { titleKey: string; descriptionKey: string }
> = {
  'signed-out-kyc-pending': {
    titleKey: 'card.card_home.setup_pending.signed_out_pending.title',
    descriptionKey:
      'card.card_home.setup_pending.signed_out_pending.description',
  },
  'identity-review': {
    titleKey: 'card.card_home.setup_pending.reviewing.title',
    descriptionKey: 'card.card_home.setup_pending.reviewing.description',
  },
  'immersve-review': {
    titleKey: 'card.card_home.setup_pending.reviewing.title',
    descriptionKey: 'card.card_home.setup_pending.reviewing.description',
  },
  'creating-card': {
    titleKey: 'card.card_home.setup_pending.creating.title',
    descriptionKey: 'card.card_home.setup_pending.creating.description',
  },
  'immersve-reconciling': {
    titleKey: 'card.card_home.setup_pending.signed_out_pending.title',
    descriptionKey:
      'card.card_home.setup_pending.signed_out_pending.description',
  },
};

/** Copy key for a waiting step. A reconcile check keeps the last settled copy. */
export const resolveCardHomeWaitingCopyStep = (
  step: CardHomeWaitingStep,
  lastSettledStep: CardHomeWaitingStep | null,
): CardHomeWaitingStep => {
  if (step !== 'immersve-reconciling') {
    return step;
  }
  if (lastSettledStep && lastSettledStep !== 'immersve-reconciling') {
    return lastSettledStep;
  }
  return 'signed-out-kyc-pending';
};
