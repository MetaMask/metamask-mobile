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
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useTokenFiatRate } from '../../hooks/useTokenFiatRate';
import {
  isPriceRangeInCurrentCurrency,
  type RecurringPriceRange,
} from '../../utils/priceRange';
import PriceRangeSheet from './PriceRangeSheet';

export const PriceRangeSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const priceRange = useSelector(selectRecurringPriceRange);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const sourceFiatRate = useTokenFiatRate(sourceToken);
  const destFiatRate = useTokenFiatRate(destToken);
  const effectiveRange = isPriceRangeInCurrentCurrency(
    priceRange,
    currentCurrency,
  )
    ? priceRange
    : undefined;

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
      sourceFiatRate={sourceFiatRate}
      destFiatRate={destFiatRate}
      currentCurrency={currentCurrency}
      initialTokenSide={effectiveRange?.tokenSide}
      initialMin={effectiveRange?.min}
      initialMax={effectiveRange?.max}
      onConfirm={handleConfirm}
      goBack={goBack}
    />
  );
};
