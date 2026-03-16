import React from 'react';
import { MusdConversionInfo } from '../musd-conversion-info';
import { MusdMaxConversionInfo } from '../musd-max-conversion-info';
import { useParams } from '../../../../../../util/navigation/navUtils';

export const MusdConversionInfoRoot = () => {
  const { forceBottomSheet } = useParams<{ forceBottomSheet?: boolean }>();

  return forceBottomSheet ? <MusdMaxConversionInfo /> : <MusdConversionInfo />;
};
