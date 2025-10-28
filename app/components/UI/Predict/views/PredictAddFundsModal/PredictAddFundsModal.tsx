import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import PredictAddFundsSheet, {
  PredictAddFundsSheetRef,
} from '../../components/PredictAddFundsSheet/PredictAddFundsSheet';

const PredictAddFundsModal: React.FC = () => {
  const navigation = useNavigation();
  const predictUnavailableRef = useRef<PredictAddFundsSheetRef>(null);

  useEffect(() => {
    predictUnavailableRef.current?.onOpenBottomSheet();
  }, []);

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <PredictAddFundsSheet
      ref={predictUnavailableRef}
      onDismiss={handleDismiss}
    />
  );
};

export default PredictAddFundsModal;
