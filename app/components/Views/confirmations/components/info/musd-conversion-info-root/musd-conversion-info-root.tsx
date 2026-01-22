import React from 'react';
import { useTransactionPayIsMaxAmount } from '../../../hooks/pay/useTransactionPayData';
import { MusdConversionInfo } from '../musd-conversion-info';
import { MusdMaxConversionInfo } from '../musd-max-conversion-info';

export const MusdConversionInfoRoot = () => {
  const isMaxAmount = useTransactionPayIsMaxAmount();

  return isMaxAmount ? <MusdMaxConversionInfo /> : <MusdConversionInfo />;
};
