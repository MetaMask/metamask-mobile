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
import type { RecurringPriceRange } from '../../utils/priceRange';
import PriceRangeSheet from './PriceRangeSheet';

export const PriceRangeSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const priceRange = useSelector(selectRecurringPriceRange);
  const currentCurrency = useSelector(selectCurrentCurrency) ?? 'usd';
  const sourceFiatRate = useTokenFiatRate(sourceToken);
  const destFiatRate = useTokenFiatRate(destToken);
  const isStoredCurrencyCurrent =
    priceRange?.currency.toUpperCase() === currentCurrency.toUpperCase();

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
      currency={currentCurrency}
      sourceFiatRate={sourceFiatRate}
      destFiatRate={destFiatRate}
      initialTokenSide={priceRange?.tokenSide}
      initialMin={isStoredCurrencyCurrent ? priceRange?.min : undefined}
      initialMax={isStoredCurrencyCurrent ? priceRange?.max : undefined}
      onConfirm={handleConfirm}
      goBack={goBack}
    />
  );
};
