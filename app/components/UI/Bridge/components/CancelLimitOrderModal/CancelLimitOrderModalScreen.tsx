import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useParams } from '../../../../../util/navigation/navUtils';
import { CancelLimitOrderModal } from './CancelLimitOrderModal';
import type { CancelLimitOrderModalParams } from './types';

export const CancelLimitOrderModalScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();
  const { onConfirm } = useParams<CancelLimitOrderModalParams>();

  return <CancelLimitOrderModal onConfirm={onConfirm} goBack={goBack} />;
};
