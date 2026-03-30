import React from 'react';
import SRPList from '../../UI/SRPList';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../constants/navigation/Routes';
import type { ViewStyle } from 'react-native';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';

const SelectSRP = ({
  containerStyle,
  showArrowName,
}: {
  containerStyle?: ViewStyle;
  showArrowName?: string;
}) => {
  const navigation = useNavigation();
  const isSeedlessLoginFlow = useSelector(selectSeedlessOnboardingLoginFlow);

  const onKeyringSelect = (keyringId: string) => {
    if (isSeedlessLoginFlow) {
      navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
        shouldUpdateNav: true,
        keyringId,
      });
      return;
    }
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
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
