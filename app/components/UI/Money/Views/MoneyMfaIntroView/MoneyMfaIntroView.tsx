import React, { useCallback, useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import { Easing, Keyframe } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { brandColor } from '@metamask/design-tokens';
import { Theme, useTailwind } from '@metamask/design-system-twrnc-preset';
import MarketingMoment from '../../../MarketingMoment';
import {
  getActiveMfaFlow,
  subscribeToActiveMfaFlow,
} from '../../../../../util/identity/mfa/engine/activeFlow';
import type { MfaFlow } from '../../../../../util/identity/mfa/engine/types';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyMfa } from '../../hooks/useMoneyMfa';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { COMPONENT_NAMES } from '../../constants/moneyEvents';
import {
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyButtonEvents';
import MoneyMfaShieldAnimation from '../../components/MoneyMfa/MoneyMfaShieldAnimation';
import { MoneyMfaIntroViewTestIds } from './MoneyMfaIntroView.testIds';

const GRADIENT_COLORS = [brandColor.lime700, brandColor.lime800];

// Title, description, buttons, then the artwork, each fading in as it rises into place.
const enterUp = ({
  delayMs,
  durationMs,
  offsetY,
  fromScale = 1,
}: {
  delayMs: number;
  durationMs: number;
  offsetY: number;
  fromScale?: number;
}) =>
  new Keyframe({
    0: {
      opacity: 0,
      transform: [{ translateY: offsetY }, { scale: fromScale }],
    },
    100: {
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
      easing: Easing.out(Easing.cubic),
    },
  })
    .delay(delayMs)
    .duration(durationMs);

export const ARTWORK_ENTER_DELAY_MS = 680;
// Matches the slide-in of the 2-step verification screen, so the intro closes once covered.
export const FLOW_ENTER_MS = 350;

const titleEntering = enterUp({
  delayMs: 80,
  durationMs: 500,
  offsetY: 20,
  fromScale: 0.98,
});
const descriptionEntering = enterUp({
  delayMs: 280,
  durationMs: 500,
  offsetY: 18,
});
const actionsEntering = enterUp({
  delayMs: 480,
  durationMs: 500,
  offsetY: 18,
});
const artworkEntering = enterUp({
  delayMs: ARTWORK_ENTER_DELAY_MS,
  durationMs: 750,
  offsetY: 24,
});

const MoneyMfaIntroView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { turnOn } = useMoneyMfa();
  const { trackComponentViewed, trackButtonClicked } = useMoneyAnalytics({
    component_name: COMPONENT_NAMES.MONEY_MFA_INTRO,
  });

  useMountEffect(trackComponentViewed);

  const stopWaiting = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => stopWaiting.current?.(), []);

  const handleContinue = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ENABLE_MFA,
      label_key: 'money.mfa.intro_continue',
    });
    if (stopWaiting.current) return;
    // The intro closes under the 2-step verification screen; without this its fade plays when that screen closes.
    navigation.setOptions({ animation: 'none' });
    // Close once a full-screen step has slid over the intro; under the picker sheet, stay until the flow ends.
    let closed = false;
    let coverTimer: ReturnType<typeof setTimeout> | undefined;
    let stopStep: (() => void) | undefined;
    const close = () => {
      if (closed) return;
      closed = true;
      stopWaiting.current?.();
      navigation.goBack();
    };
    const watchStep = (flow: MfaFlow) => {
      const check = () => {
        const { name } = flow.getState().step;
        if (name !== 'idle' && name !== 'picker') {
          coverTimer ??= setTimeout(close, FLOW_ENTER_MS);
        }
      };
      stopStep = flow.subscribe(check);
      check();
    };
    let flowStarted = false;
    const stopFlow = subscribeToActiveMfaFlow(() => {
      const flow = getActiveMfaFlow();
      if (flow && !flowStarted) {
        flowStarted = true;
        watchStep(flow);
      } else if (!flow && flowStarted) close();
    });
    stopWaiting.current = () => {
      closed = true;
      clearTimeout(coverTimer);
      stopStep?.();
      stopFlow();
    };
    void turnOn('card').finally(close);
  }, [navigation, trackButtonClicked, turnOn]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <MarketingMoment
        testID={MoneyMfaIntroViewTestIds.CONTAINER}
        theme={Theme.Dark}
        background={
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={tw.style('flex-1')}
          />
        }
        title={strings('money.mfa.intro_screen_title')}
        titleProps={{
          accessibilityRole: 'header',
          twClassName: 'text-accent03-normal text-center',
        }}
        description={strings('money.mfa.intro_screen_description')}
        descriptionProps={{ twClassName: 'text-accent03-light text-center' }}
        artwork={
          <MoneyMfaShieldAnimation
            size={260}
            playDelayMs={ARTWORK_ENTER_DELAY_MS}
          />
        }
        titleWrapperAnimatedViewProps={{ entering: titleEntering }}
        descriptionWrapperAnimatedViewProps={{ entering: descriptionEntering }}
        actionsWrapperAnimatedViewProps={{ entering: actionsEntering }}
        artworkWrapperAnimatedViewProps={{ entering: artworkEntering }}
        primaryAction={{
          label: strings('money.mfa.intro_continue'),
          onPress: handleContinue,
          twClassName: 'bg-accent03-light',
          textProps: { twClassName: 'text-accent03-dark' },
          testID: MoneyMfaIntroViewTestIds.CONTINUE_BUTTON,
        }}
        secondaryAction={{
          label: strings('money.mfa.intro_not_now'),
          onPress: navigation.goBack,
          textProps: { twClassName: 'text-accent03-light' },
          testID: MoneyMfaIntroViewTestIds.NOT_NOW_BUTTON,
        }}
      />
    </>
  );
};

export default MoneyMfaIntroView;
