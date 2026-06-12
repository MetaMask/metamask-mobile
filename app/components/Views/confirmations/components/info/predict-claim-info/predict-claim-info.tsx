import React, { useCallback } from 'react';
import {
  PredictClaimAmount,
  PredictClaimAmountSkeleton,
} from '../../predict-confirmations/predict-claim-amount';
import { PredictClaimBackground } from '../../predict-confirmations/predict-claim-background';
import { useModalNavbar } from '../../../hooks/ui/useNavbar';
import { usePredictClaimConfirmationMetrics } from '../../../hooks/metrics/usePredictClaimConfirmationMetrics';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './predict-claim-info.styles';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import Engine from '../../../../../../core/Engine';

export function PredictClaimInfo() {
  useModalNavbar();
  usePredictClaimConfirmationMetrics();
  const clearPendingClaim = useCallback(() => {
    Engine.context.PredictController.clearPendingClaim();
  }, []);

  const rejectConfirmation = useClearConfirmationOnBackSwipe({
    rejectOnBeforeRemove: true,
    rejectOnBeforeRemoveWithoutGesture: true,
    skipNavigationOnGestureEnd: false,
    onBeforeReject: clearPendingClaim,
  });

  return (
    <>
      <BackButton onReject={rejectConfirmation} />
      <PredictClaimBackground />
      <PredictClaimAmount />
    </>
  );
}

export function PredictClaimInfoSkeleton() {
  return (
    <>
      <PredictClaimBackground />
      <PredictClaimAmountSkeleton />
    </>
  );
}

/**
 * Intentionally not using navigation header as `headerTransparent` not rendering buttons on Android.
 */
function BackButton({ onReject }: { onReject: () => void }) {
  const { styles } = useStyles(styleSheet, {});

  const handleReject = useCallback(() => {
    onReject();
  }, [onReject]);

  return (
    <ButtonIcon
      size={ButtonIconSizes.Lg}
      iconName={IconName.Close}
      onPress={handleReject}
      style={styles.backButton}
    />
  );
}
