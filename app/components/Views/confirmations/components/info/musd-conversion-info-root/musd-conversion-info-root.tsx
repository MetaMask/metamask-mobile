import React from 'react';
import { MusdConversionInfo } from '../musd-conversion-info';
import { MusdMaxConversionInfo } from '../musd-max-conversion-info';
import { useConfirmationVariant } from '../../../hooks/useConfirmationVariant';
import { MusdConversionVariant } from '../../../../../UI/Earn/hooks/useMusdConversion';

export const MusdConversionInfoRoot = () => {
  const variant = useConfirmationVariant();

  return variant === MusdConversionVariant.QUICK_CONVERT ? (
    <MusdMaxConversionInfo />
  ) : (
    <MusdConversionInfo />
  );
};
