import React, { useCallback, useEffect } from 'react';
import { BackHandler, PixelRatio, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Fit,
  RiveView,
  useRiveFile,
  useRiveNumber,
  useRiveString,
  useRiveTrigger,
  useViewModelInstance,
  type RiveError,
} from '@rive-app/react-native';
import { createProjectLogger } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { selectMoneyParallaxAnimationEnabledFlag } from '../../selectors/featureFlags';
import {
  pitchToParallaxValue,
  tiltToParallaxValue,
} from '../../utils/parallax';
import { SCREEN_NAMES } from '../../constants/moneyEvents';
import { MoneyFirstTimeDepositViewTestIds } from './MoneyFirstTimeDepositView.testIds';
import useMountEffect from '../../hooks/useMountEffect';
import MoneyAccountFirstTimeDepositAnimationV4 from '../../../../../animations/money_account_first_time_deposit_v4.riv';
import Routes from '../../../../../constants/navigation/Routes';

const log = createProjectLogger('money-first-time-deposit');

// -- Rive data-binding names ----------------------------------------------
// These MUST match the names authored in the .riv file. If the Rive designer
// renames any of these, update the constants here to keep the binding working.

/** Name of the Rive artboard that contains the first-time deposit animation. */
const RIVE_ARTBOARD_NAME = 'Intro';

/** Trigger fired by the Rive "Done" button. Listened to for navigating home. */
const RIVE_DONE_TRIGGER = 'done';

/** Text data-binding path for the headline shown during the animation. */
const RIVE_TITLE_PATH = 'title';

/** Text data-binding path for the button text shown during the animation. */
const BUTTON_TEXT_PATH = 'button';

/** Text data-binding path for the body copy shown during the animation. */
const RIVE_CONTENT_PATH = 'content';

/** Number data-binding (0–100) driving the coins' horizontal parallax. */
const RIVE_X_VALUE_PATH = 'xValue';

/** Number data-binding (0–100) driving the coins' vertical parallax. */
const RIVE_Y_VALUE_PATH = 'yValue';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const MoneyFirstTimeDepositView = () => {
  const navigation = useNavigation<AppNavigationProp>();

  const { trackScreenViewed } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_FIRST_TIME_DEPOSIT,
  });

  const parallaxEnabled = useSelector(selectMoneyParallaxAnimationEnabledFlag);
  const reduceMotion = useReduceMotion();

  const { riveFile } = useRiveFile(MoneyAccountFirstTimeDepositAnimationV4);
  const { instance } = useViewModelInstance(riveFile, {
    artboardName: RIVE_ARTBOARD_NAME,
    async: true,
  });

  const { setValue: setTitle } = useRiveString(RIVE_TITLE_PATH, instance);
  const { setValue: setContent } = useRiveString(RIVE_CONTENT_PATH, instance);
  const { setValue: setButtonText } = useRiveString(BUTTON_TEXT_PATH, instance);
  const { setValue: setXValue } = useRiveNumber(RIVE_X_VALUE_PATH, instance);
  const { setValue: setYValue } = useRiveNumber(RIVE_Y_VALUE_PATH, instance);

  const goHome = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  useMountEffect(trackScreenViewed);

  // Intercept Android hardware-back so it behaves like tapping "Done".
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        goHome();
        return true;
      },
    );
    return () => subscription.remove();
  }, [goHome]);

  // Listen for the Rive "Done" button trigger
  useRiveTrigger(RIVE_DONE_TRIGGER, instance, {
    onTrigger: goHome,
  });

  // Once the view-model instance is ready, inject the i18n text.
  useEffect(() => {
    if (!instance) return;

    setTitle(strings('money.first_time_deposit.title'));
    setContent(strings('money.first_time_deposit.content'));
    setButtonText(strings('money.first_time_deposit.button_text'));
  }, [instance, setTitle, setContent, setButtonText]);

  const applyTilt = useCallback(
    (x: number, y: number) => {
      setXValue(tiltToParallaxValue(x));
      setYValue(pitchToParallaxValue(y));
    },
    [setXValue, setYValue],
  );

  useDeviceOrientation(applyTilt, {
    enabled: parallaxEnabled && !reduceMotion,
  });

  const handleError = useCallback(
    (riveError: RiveError) => {
      log(`Rive error: ${riveError.message}`);
      goHome();
    },
    [goHome],
  );

  return (
    <View style={styles.root}>
      {riveFile && instance && (
        <RiveView
          file={riveFile}
          artboardName={RIVE_ARTBOARD_NAME}
          dataBind={instance}
          autoPlay
          fit={Fit.Layout}
          layoutScaleFactor={PixelRatio.get()}
          style={StyleSheet.absoluteFillObject}
          onError={handleError}
          testID={MoneyFirstTimeDepositViewTestIds.RIVE_ANIMATION}
        />
      )}
    </View>
  );
};

export default MoneyFirstTimeDepositView;
