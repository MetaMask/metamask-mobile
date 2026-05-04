import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';

import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import ScreenView from '../../../../Base/ScreenView';

export function MultiSwapTokenSelect() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title: '',
        onBack: () => navigation.goBack(),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

  return <ScreenView>{null}</ScreenView>;
}
