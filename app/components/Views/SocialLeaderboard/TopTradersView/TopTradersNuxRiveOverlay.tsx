import React, { useCallback, useEffect } from 'react';
import { Modal, StyleSheet } from 'react-native';
import Rive, {
  Alignment,
  AutoBind,
  Fit,
  RNRiveError,
  useRive,
  useRiveNumber,
  useRiveString,
  useRiveTrigger,
} from 'rive-react-native';
import Logger from '../../../../util/Logger';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const SocialLeaderboardNuxAnimation = require('../../../../animations/onboarding_nux_v1.riv');

const RIVE_ARTBOARD_NAME = 'Money_Account';
const RIVE_STATE_MACHINE_NAME = 'State Machine 1';

interface TopTradersNuxRiveOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

const styles = StyleSheet.create({
  rive: {
    flex: 1,
  },
});

const TopTradersNuxRiveOverlay = ({
  visible,
  onDismiss,
}: TopTradersNuxRiveOverlayProps) => {
  const [ref, riveRef] = useRive();

  const [, setStep1Title] = useRiveString(riveRef, 'stepText1/title');
  const [, setStep1Content] = useRiveString(riveRef, 'stepText1/content');
  const [, setStep1PrimaryButton] = useRiveString(
    riveRef,
    'stepText1/primaryButton',
  );
  const [, setStep1SecondaryButton] = useRiveString(
    riveRef,
    'stepText1/secondaryButton',
  );

  const [, setStep2Title] = useRiveString(riveRef, 'stepText2/title');
  const [, setStep2Content] = useRiveString(riveRef, 'stepText2/content');
  const [, setStep2PrimaryButton] = useRiveString(
    riveRef,
    'stepText2/primaryButton',
  );
  const [, setStep2SecondaryButton] = useRiveString(
    riveRef,
    'stepText2/secondaryButton',
  );

  const [, setStep3Title] = useRiveString(riveRef, 'stepText3/title');
  const [, setStep3Content] = useRiveString(riveRef, 'stepText3/content');
  const [, setStep3PrimaryButton] = useRiveString(
    riveRef,
    'stepText3/primaryButton',
  );
  const [, setStep3SecondaryButton] = useRiveString(
    riveRef,
    'stepText3/secondaryButton',
  );

  const [, setNotificationBuyer] = useRiveString(riveRef, 'notification/buyer');
  const [, setNotificationAssetName] = useRiveString(
    riveRef,
    'notification/assetName',
  );
  const [, setNotificationTotalCost] = useRiveString(
    riveRef,
    'notification/totalCost',
  );
  const [, setNotificationMarketCap] = useRiveString(
    riveRef,
    'notification/marketCap',
  );

  const [, setAssetName] = useRiveString(riveRef, 'asset/assetName');
  const [, setEstimatedPoints] = useRiveString(
    riveRef,
    'asset/estimatedPoints',
  );
  const [, setAssetTotalCost] = useRiveString(riveRef, 'asset/totalCost');
  const [, setPaymentBalance] = useRiveString(riveRef, 'asset/paymentBalance');
  const [, setAssetAmount] = useRiveString(riveRef, 'asset/assetAmount');
  const [, setFiatAmount] = useRiveString(riveRef, 'asset/fiatAmount');
  const [, setMarketCap] = useRiveString(riveRef, 'asset/marketCap');

  const [, setTrader1Name] = useRiveString(riveRef, 'traderTop1/name');
  const [, setTrader1Period] = useRiveString(riveRef, 'traderTop1/period');
  const [, setTrader1ProfitAmount] = useRiveString(
    riveRef,
    'traderTop1/profitAmount',
  );
  const [, setTrader1ProfitPercent] = useRiveString(
    riveRef,
    'traderTop1/profitPercent',
  );

  const [, setTrader2Name] = useRiveString(riveRef, 'traderTop2/name');
  const [, setTrader2Period] = useRiveString(riveRef, 'traderTop2/period');
  const [, setTrader2ProfitAmount] = useRiveString(
    riveRef,
    'traderTop2/profitAmount',
  );
  const [, setTrader2ProfitPercent] = useRiveString(
    riveRef,
    'traderTop2/profitPercent',
  );

  const [, setTrader3Name] = useRiveString(riveRef, 'traderTop3/name');
  const [, setTrader3Period] = useRiveString(riveRef, 'traderTop3/period');
  const [, setTrader3ProfitAmount] = useRiveString(
    riveRef,
    'traderTop3/profitAmount',
  );
  const [, setTrader3ProfitPercent] = useRiveString(
    riveRef,
    'traderTop3/profitPercent',
  );

  const [, setTransitionSpeed] = useRiveNumber(riveRef, 'transitionSpeed');
  const [, setCoinSeq] = useRiveNumber(riveRef, 'coinSeq');
  const [, setCardSeq] = useRiveNumber(riveRef, 'cardSeq');

  // Only the in-animation close button (the Rive `close` trigger) dismisses the
  // overlay. The other triggers — next / gotIt / allowNotifications /
  // followTopTraders / maybeLater — drive the Rive state machine's own step
  // navigation, so we must not intercept them, otherwise tapping a button would
  // close the whole flow instead of advancing to the next screen.
  useRiveTrigger(riveRef, 'close', onDismiss);

  useEffect(() => {
    if (!riveRef || !visible) return;

    setStep1Title('Trade like a pro');
    setStep1Content(
      'Track in real time when they swap or trade perps, tokens, and real-world assets.',
    );
    setStep1PrimaryButton('Next');
    setStep1SecondaryButton('');

    setStep2Title('Never miss a move');
    setStep2Content(
      "When a trader you follow makes a move, you'll get a notification. One tap to do the same.",
    );
    setStep2PrimaryButton('Allow notifications');
    setStep2SecondaryButton('Got it');

    setStep3Title('Follow the best');
    setStep3Content(
      'Tap to follow the top three traders who are up big this week.',
    );
    setStep3PrimaryButton('Follow the top three');
    setStep3SecondaryButton('Maybe later');

    // Notification card + buy modal (step 2). Each value is atomic: the Rive
    // text runs supply the surrounding literals ("@", "bought $", "m ago", "$",
    // "Buy ", "market cap", "PUNCH", "Total", "Est. points"). Passing
    // pre-composed sentences here makes the text overflow its container.
    setNotificationBuyer('dutchiono');
    setNotificationAssetName('PUNCH');
    setNotificationTotalCost('2,488');
    setNotificationMarketCap('1.24');

    setAssetName('PUNCH');
    setEstimatedPoints('126');
    setAssetTotalCost('2,488');
    setPaymentBalance('2,488');
    setAssetAmount('1,993,589');
    setFiatAmount('2,488');
    setMarketCap('1.24');

    setTrader1Name('dutchiono');
    setTrader1Period('7D');
    setTrader1ProfitAmount('+$40,670K');
    setTrader1ProfitPercent('+86.1%');

    setTrader2Name('raggedandrusty');
    setTrader2Period('7D');
    setTrader2ProfitAmount('+$35,010K');
    setTrader2ProfitPercent('+92.2%');

    setTrader3Name('aparjey');
    setTrader3Period('7D');
    setTrader3ProfitAmount('+$45,900K');
    setTrader3ProfitPercent('+50.2%');

    setTransitionSpeed(300);
    setCoinSeq(0);
    setCardSeq(0);
  }, [
    riveRef,
    visible,
    setStep1Title,
    setStep1Content,
    setStep1PrimaryButton,
    setStep1SecondaryButton,
    setStep2Title,
    setStep2Content,
    setStep2PrimaryButton,
    setStep2SecondaryButton,
    setStep3Title,
    setStep3Content,
    setStep3PrimaryButton,
    setStep3SecondaryButton,
    setNotificationBuyer,
    setNotificationAssetName,
    setNotificationTotalCost,
    setNotificationMarketCap,
    setAssetName,
    setEstimatedPoints,
    setAssetTotalCost,
    setPaymentBalance,
    setAssetAmount,
    setFiatAmount,
    setMarketCap,
    setTrader1Name,
    setTrader1Period,
    setTrader1ProfitAmount,
    setTrader1ProfitPercent,
    setTrader2Name,
    setTrader2Period,
    setTrader2ProfitAmount,
    setTrader2ProfitPercent,
    setTrader3Name,
    setTrader3Period,
    setTrader3ProfitAmount,
    setTrader3ProfitPercent,
    setTransitionSpeed,
    setCoinSeq,
    setCardSeq,
  ]);

  const handleError = useCallback((riveError: RNRiveError) => {
    Logger.error(
      new Error(riveError.message),
      `TopTradersNuxRiveOverlay: Rive failed (${riveError.type})`,
    );
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      <Rive
        ref={ref}
        source={SocialLeaderboardNuxAnimation}
        artboardName={RIVE_ARTBOARD_NAME}
        stateMachineName={RIVE_STATE_MACHINE_NAME}
        dataBinding={AutoBind(true)}
        // The artboard is authored at a fixed phone aspect ratio, so it is
        // rendered as-designed (uniform scale, edge-to-edge) rather than reflowed.
        // `Fit.Layout` runs Rive's responsive layout engine, which — inside this
        // full-screen Modal — reflows at the wrong density and makes text runs
        // overflow their containers and layout-driven fills drop out. `Fit.Cover`
        // keeps the composition intact. `layoutScaleFactor` only applies to
        // `Fit.Layout`, so it is intentionally omitted here.
        fit={Fit.Cover}
        alignment={Alignment.Center}
        style={styles.rive}
        onError={handleError}
      />
    </Modal>
  );
};

export default TopTradersNuxRiveOverlay;
