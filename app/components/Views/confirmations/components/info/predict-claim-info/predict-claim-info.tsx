import React, { useCallback } from 'react';
import {
  PredictClaimAmount,
  PredictClaimAmountSkeleton,
} from '../../predict-confirmations/predict-claim-amount';
import { PredictClaimBackground } from '../../predict-confirmations/predict-claim-background';
import { useModalNavbar } from '../../../hooks/ui/useNavbar';
import { usePredictClaimConfirmationMetrics } from '../../../hooks/metrics/usePredictClaimConfirmationMetrics';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './predict-claim-info.styles';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';

export function PredictClaimInfo() {
  useModalNavbar();
  usePredictClaimConfirmationMetrics();

  const rejectConfirmation = useClearConfirmationOnBackSwipe();

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
      size={ButtonIconSize.Lg}
      iconName={IconName.Close}
      onPress={handleReject}
      style={styles.backButton}
    />
  );
}
