import React from 'react';
import SRPList from '../../UI/SRPList';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import type { ViewStyle } from 'react-native';

const SelectSRP = ({
  containerStyle,
  showArrowName,
}: {
  containerStyle?: ViewStyle;
  showArrowName?: string;
}) => {
  const navigation = useNavigation<AppNavigationProp>();

  const onKeyringSelect = (keyringId: string) => {
    navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      shouldUpdateNav: true,
      keyringId,
    });
  };

  return (
    <SRPList
      onKeyringSelect={onKeyringSelect}
      containerStyle={containerStyle}
      showArrowName={showArrowName}
    />
  );
};

export default SelectSRP;
