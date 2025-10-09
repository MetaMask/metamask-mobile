import React, { useEffect } from 'react';
import { AmountHighlight } from '../../transactions/amount-highlight';
import { useNavigation } from '@react-navigation/native';
import { PredictClaimBackground } from '../../predict-confirmations/predict-claim-background';

export function PredictClaimInfo() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <>
      <PredictClaimBackground />
      <AmountHighlight />
    </>
  );
}
