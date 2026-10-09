import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import RecurringRepeatInfoSheet from './RecurringRepeatInfoSheet';

export const RecurringRepeatInfoSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();

  return <RecurringRepeatInfoSheet goBack={goBack} />;
};
