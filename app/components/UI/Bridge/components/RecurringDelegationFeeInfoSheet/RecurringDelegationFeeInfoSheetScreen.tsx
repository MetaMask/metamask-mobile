import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import RecurringDelegationFeeInfoSheet from './RecurringDelegationFeeInfoSheet';

export const RecurringDelegationFeeInfoSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();

  return <RecurringDelegationFeeInfoSheet goBack={goBack} />;
};
