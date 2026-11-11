import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import LimitOrderMetaMaskFeeInfoSheet from './LimitOrderMetaMaskFeeInfoSheet';

export const LimitOrderMetaMaskFeeInfoSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();

  return <LimitOrderMetaMaskFeeInfoSheet goBack={goBack} />;
};
