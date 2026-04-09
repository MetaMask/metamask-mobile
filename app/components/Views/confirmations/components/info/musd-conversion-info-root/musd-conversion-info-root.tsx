import React from 'react';
import { MusdConversionInfo } from '../musd-conversion-info';
import { MusdMaxConversionInfo } from '../musd-max-conversion-info';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { useMusdConversionConfirmationMetrics } from '../../../hooks/metrics/useMusdConversionConfirmationMetrics';

export const MusdConversionInfoRoot = () => {
  const { forceBottomSheet } = useParams<{ forceBottomSheet?: boolean }>();
  useMusdConversionConfirmationMetrics();

  return forceBottomSheet ? <MusdMaxConversionInfo /> : <MusdConversionInfo />;
};
