import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import PredictUnavailable, {
  PredictUnavailableRef,
} from '../../components/PredictUnavailable/PredictUnavailable';

const PredictUnavailableModal: React.FC = () => {
  const navigation = useNavigation();
  const predictUnavailableRef = useRef<PredictUnavailableRef>(null);

  useEffect(() => {
    predictUnavailableRef.current?.onOpenBottomSheet();
  }, []);

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <PredictUnavailable ref={predictUnavailableRef} onDismiss={handleDismiss} />
  );
};

export default PredictUnavailableModal;
