import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectDestToken,
  selectRecurringPriceRange,
  selectSourceToken,
  setRecurringPriceRange,
} from '../../../../../core/redux/slices/bridge';
import { useTokenUsdRate } from '../../hooks/useTokenFiatRate';
import type { RecurringPriceRange } from '../../utils/priceRange';
import PriceRangeSheet from './PriceRangeSheet';

export const PriceRangeSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const priceRange = useSelector(selectRecurringPriceRange);
  const sourceUsdRate = useTokenUsdRate(sourceToken);
  const destUsdRate = useTokenUsdRate(destToken);

  const handleConfirm = useCallback(
    (nextPriceRange?: RecurringPriceRange) => {
      dispatch(setRecurringPriceRange(nextPriceRange));
    },
    [dispatch],
  );

  return (
    <PriceRangeSheet
      sourceToken={sourceToken}
      destToken={destToken}
      sourceUsdRate={sourceUsdRate}
      destUsdRate={destUsdRate}
      initialTokenSide={priceRange?.tokenSide}
      initialMin={priceRange?.min}
      initialMax={priceRange?.max}
      onConfirm={handleConfirm}
      goBack={goBack}
    />
  );
};
