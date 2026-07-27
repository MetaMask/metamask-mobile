import React, { useCallback, useEffect } from 'react';
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

  const [ref, riveRef] = useRive();

  const [, setTitle] = useRiveString(riveRef, RIVE_TITLE_PATH);
  const [, setContent] = useRiveString(riveRef, RIVE_CONTENT_PATH);
  const [, setButtonText] = useRiveString(riveRef, BUTTON_TEXT_PATH);

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
  useRiveTrigger(riveRef, RIVE_DONE_TRIGGER, () => {
    goHome();
  });

  // Once the Rive ref is ready, inject the i18n text.
  useEffect(() => {
    if (!riveRef) return;

    setTitle(strings('money.first_time_deposit.title'));
    setContent(strings('money.first_time_deposit.content'));
    setButtonText(strings('money.first_time_deposit.button_text'));
  }, [riveRef, setTitle, setContent, setButtonText]);

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
        source={MoneyAccountFirstTimeDepositAnimationV4}
        artboardName={RIVE_ARTBOARD_NAME}
        dataBinding={AutoBind(true)}
        fit={Fit.Layout}
        layoutScaleFactor={PixelRatio.get()}
        style={StyleSheet.absoluteFill}
        onError={handleError}
        testID={MoneyFirstTimeDepositViewTestIds.RIVE_ANIMATION}
      />
    </View>
  );
};

export default MoneyFirstTimeDepositView;
