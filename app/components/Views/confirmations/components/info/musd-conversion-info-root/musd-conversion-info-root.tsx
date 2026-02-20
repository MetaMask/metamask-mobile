import React from 'react';
import { MusdConversionInfo } from '../musd-conversion-info';
import { MusdMaxConversionInfo } from '../musd-max-conversion-info';
import { MusdConversionVariant } from '../../../../../UI/Earn/types/musd.types';
import { useParams } from '../../../../../../util/navigation/navUtils';

export const MusdConversionInfoRoot = () => {
  const { variant } = useParams<{ variant?: string }>();

  return variant === MusdConversionVariant.QUICK_CONVERT ? (
    <MusdMaxConversionInfo />
  ) : (
    <MusdConversionInfo />
  );
};
