import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import PredictUnavailable, {
  PredictUnavailableRef,
} from '../../components/PredictUnavailable/PredictUnavailable';

const PredictUnavailableModal: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
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
