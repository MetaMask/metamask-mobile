import React from 'react';
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
import { IconName } from '@metamask/design-system-react-native';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './predict-claim-info.styles';

export function PredictClaimInfo() {
  useModalNavbar();
  usePredictClaimConfirmationMetrics();

  return (
    <>
      <BackButton />
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
function BackButton() {
  const { styles } = useStyles(styleSheet, {});
  const { onReject } = useConfirmActions();

  return (
    <ButtonIcon
      size={ButtonIconSizes.Lg}
      // @ts-expect-error - dsrn IconName is string-compatible with component-library IconName
      iconName={IconName.Close}
      onPress={() => onReject()}
      style={styles.backButton}
    />
  );
}
