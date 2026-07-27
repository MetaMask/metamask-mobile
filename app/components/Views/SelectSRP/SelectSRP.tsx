import React from 'react';
import SRPList from '../../UI/SRPList';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import type { ViewStyle } from 'react-native';

const SelectSRP = ({
  containerStyle,
  showArrowName,
  onKeyringSelect: onKeyringSelectProp,
}: {
  containerStyle?: ViewStyle;
  showArrowName?: string;
  onKeyringSelect?: (keyringId: string) => void;
}) => {
  const navigation = useNavigation();

  const onKeyringSelect = (keyringId: string) => {
    if (onKeyringSelectProp) {
      onKeyringSelectProp(keyringId);
      return;
    }

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
