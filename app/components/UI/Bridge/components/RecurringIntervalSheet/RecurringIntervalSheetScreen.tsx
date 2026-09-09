import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectRecurringEveryUnit,
  setRecurringEveryUnit,
} from '../../../../../core/redux/slices/bridge';
import type { RecurringIntervalUnit } from '../../utils/recurringSchedule';
import RecurringIntervalSheet from './RecurringIntervalSheet';

export const RecurringIntervalSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const currentUnit = useSelector(selectRecurringEveryUnit);

  const handleConfirm = useCallback(
    (unit: RecurringIntervalUnit) => {
      dispatch(setRecurringEveryUnit(unit));
    },
    [dispatch],
  );

  return (
    <RecurringIntervalSheet
      currentUnit={currentUnit}
      onConfirm={handleConfirm}
      goBack={goBack}
    />
  );
};
