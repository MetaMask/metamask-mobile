import React, { useCallback, useEffect, useRef } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import PredictAddFundsSheet, {
  PredictAddFundsSheetRef,
} from '../../components/PredictAddFundsSheet/PredictAddFundsSheet';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import type { PredictNavigationParamList } from '../../types/navigation';

type PredictAddFundsModalRoute = RouteProp<
  PredictNavigationParamList,
  'PredictAddFundsSheet'
>;

const PredictAddFundsModal: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PredictAddFundsModalRoute>();
  const autoDeposit = route.params?.autoDeposit ?? false;
  const predictUnavailableRef = useRef<PredictAddFundsSheetRef>(null);
  const { deposit } = usePredictDeposit();

  // Keep a stable ref so the mount-only effect always calls the latest deposit
  // without taking deposit as a dependency (which would cause an infinite loop
  // because deposit recreates whenever navigateToConfirmation changes).
  const depositRef = useRef(deposit);
  depositRef.current = deposit;

  // Tracks whether MMPay has been pushed on top (blur fired) so the focus
  // listener knows it is returning from MMPay, not firing on initial mount.
  const hasBlurredRef = useRef(false);

  // When autoDeposit: listen for blur (MMPay opens) then focus (MMPay closes).
  // Only call goBack() on the return focus, not the initial mount focus.
  useEffect(() => {
    if (!autoDeposit) return undefined;

    const unsubscribeBlur = navigation.addListener('blur', () => {
      hasBlurredRef.current = true;
    });

    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (hasBlurredRef.current && navigation.canGoBack()) {
        navigation.goBack();
      }
    });

    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [autoDeposit, navigation]);

  useEffect(() => {
    if (autoDeposit) {
      depositRef.current();
    } else {
      predictUnavailableRef.current?.onOpenBottomSheet();
    }
    // Intentionally empty — run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  if (autoDeposit) {
    return null;
  }

  return (
    <PredictAddFundsSheet
      ref={predictUnavailableRef}
      onDismiss={handleDismiss}
    />
  );
};

export default PredictAddFundsModal;
