import React, { useCallback, useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { brandColor } from '@metamask/design-tokens';
import { Theme, useTailwind } from '@metamask/design-system-twrnc-preset';
import MarketingMoment from '../../../MarketingMoment';
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../core/NavigationService';
import {
  getActiveMfaFlow,
  subscribeToActiveMfaFlow,
} from '../../../../../util/identity/mfa/engine/activeFlow';
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
    // Stay on screen until the 2-step verification modal covers it, so Money isn't shown in between.
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      stopWaiting.current?.();
      navigation.goBack();
    };
    const { navigation: root } = NavigationService;
    const isFlowOpen = () =>
      Boolean(
        root
          .getRootState()
          ?.routes.some((route) => route.name === Routes.MFA.FLOW),
      );
    const stopNavigation = root.addListener('state', () => {
      if (isFlowOpen()) close();
    });
    let flowStarted = false;
    const stopFlow = subscribeToActiveMfaFlow(() => {
      if (getActiveMfaFlow()) flowStarted = true;
      else if (flowStarted) close();
    });
    stopWaiting.current = () => {
      stopNavigation();
      stopFlow();
    };
    void turnOn().finally(close);
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
        artwork={<MoneyMfaShieldAnimation size={260} />}
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
