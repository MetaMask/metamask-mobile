import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, PixelRatio, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Rive, {
  AutoBind,
  useRive,
  useRiveString,
  useRiveTrigger,
  Fit,
  RNRiveError,
} from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { SCREEN_NAMES } from '../../constants/moneyEvents';
import { MoneyFirstTimeDepositViewTestIds } from './MoneyFirstTimeDepositView.testIds';
import useMountEffect from '../../hooks/useMountEffect';
import FirstDepositAnimation from '../../../../../animations/first_deposit_v3.riv';
import Routes from '../../../../../constants/navigation/Routes';

const log = createProjectLogger('money-first-time-deposit');

// -- Rive data-binding names ----------------------------------------------
// These MUST match the names authored in the .riv file. If the Rive designer
// renames any of these, update the constants here to keep the binding working.

/** Name of the Rive artboard that contains the first-time deposit animation. */
const RIVE_ARTBOARD_NAME = 'Intro';

/** Trigger that kicks off the intro animation sequence. */
const RIVE_START_TRIGGER = 'start';

/** Trigger fired by the Rive "Done" button. Listened to for navigating home. */
const RIVE_DONE_TRIGGER = 'done';

/** Text data-binding path for the headline shown during the animation. */
const RIVE_TITLE_PATH = 'title';

/** Text data-binding path for the button text shown during the animation. */
const BUTTON_TEXT_PATH = 'button';

/** Text data-binding path for the body copy shown during the animation. */
const RIVE_CONTENT_PATH = 'content';

/**
 * The state machine boots into this state and waits for the `start` trigger
 * before advancing to the intro timeline (Timeline 1). Firing `start` before the machine
 * reaches `init` loses the trigger and wedges it here, freezing the renderer —
 * so we fire `start` only once we observe the machine enter this state.
 */
const RIVE_INIT_STATE = 'init';

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

  // -- Rive setup ---------------------------------------------------------

  const [ref, riveRef] = useRive();

  const [, setTitle] = useRiveString(riveRef, RIVE_TITLE_PATH);
  const [, setContent] = useRiveString(riveRef, RIVE_CONTENT_PATH);
  const [, setButtonText] = useRiveString(riveRef, BUTTON_TEXT_PATH);

  const fireStart = useRiveTrigger(riveRef, RIVE_START_TRIGGER);

  const goHome = useCallback(() => {
    riveRef?.stop();

    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation, riveRef]);

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

  // Listen for the Rive "Done" button trigger → navigate home.
  useRiveTrigger(riveRef, RIVE_DONE_TRIGGER, () => {
    goHome();
  });

  // Stop the Rive state machine before the view is torn down. Unmounting while
  // the animation is still advancing corrupts the native Rive runtime and
  // wedges the *next* mount (which fires `start` but never advances past
  // `init`). This runs on every exit path — Done, Android back, error, gesture.
  useEffect(() => {
    const rive = riveRef;
    return () => {
      try {
        rive?.stop();
      } catch {
        // View already detached — nothing to pause.
      }
    };
  }, [riveRef]);

  // Once the Rive ref is ready, inject the i18n text. String bindings are safe
  // to set eagerly; the intro trigger is handled separately (see below).
  useEffect(() => {
    if (!riveRef) return;

    setTitle(strings('money.first_time_deposit.title'));
    setContent(strings('money.first_time_deposit.content'));
    setButtonText(strings('money.first_time_deposit.button_text'));
  }, [riveRef, setTitle, setContent, setButtonText]);

  // The state machine boots into `init` and waits for the `start` trigger
  // before advancing to the intro timeline. Two signals must both hold before
  // we can start it: the machine has reached `init`, and `fireStart` is ready
  // (it's undefined until `riveRef` is set). These can land in either order —
  // on a warm/cached open the machine reaches `init` before React commits the
  // render that makes `fireStart` available. Track them independently and fire
  // once BOTH hold; firing before `init`, or while `fireStart` is undefined,
  // loses the trigger and wedges the machine in `init` (freezing the UI).
  const [hasReachedInit, setHasReachedInit] = useState(false);
  const hasFiredStartRef = useRef(false);

  const handleStateChanged = useCallback(
    (_stateMachineName: string, stateName: string) => {
      if (stateName === RIVE_INIT_STATE) {
        setHasReachedInit(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasReachedInit || !fireStart || hasFiredStartRef.current) {
      return;
    }
    hasFiredStartRef.current = true;
    // Defer a tick so we don't re-enter the runtime mid-state-change.
    const id = setTimeout(() => fireStart(), 0);
    return () => clearTimeout(id);
  }, [hasReachedInit, fireStart]);

  const handleError = useCallback(
    (riveError: RNRiveError) => {
      log(`Rive error: ${riveError.message}`);
      goHome();
    },
    [goHome],
  );

  return (
    <View style={styles.root}>
      <Rive
        ref={ref}
        source={FirstDepositAnimation}
        artboardName={RIVE_ARTBOARD_NAME}
        dataBinding={AutoBind(true)}
        fit={Fit.Layout}
        layoutScaleFactor={PixelRatio.get()}
        style={StyleSheet.absoluteFillObject}
        onStateChanged={handleStateChanged}
        onError={handleError}
        testID={MoneyFirstTimeDepositViewTestIds.RIVE_ANIMATION}
      />
    </View>
  );
};

export default MoneyFirstTimeDepositView;
