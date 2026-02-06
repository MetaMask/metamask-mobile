import React from 'react';
import { MusdConversionInfo } from '../musd-conversion-info';
import { MusdMaxConversionInfo } from '../musd-max-conversion-info';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { AssetType } from '../../../types/token';
import { MusdConversionIntent } from '../../../../../UI/Earn/hooks/useMusdConversion';

export interface MusdConversionInfoRootRouteParams {
  conversionIntent: 'max' | 'custom';
  token: AssetType;
}

export const MusdConversionInfoRoot = () => {
  const { conversionIntent } = useParams<MusdConversionInfoRootRouteParams>();

  if (!conversionIntent) {
    throw new Error('Conversion intent is required in MusdConversionInfoRoot');
  }

  return conversionIntent === MusdConversionIntent.Max ? (
    <MusdMaxConversionInfo />
  ) : (
    <MusdConversionInfo />
  );
};
