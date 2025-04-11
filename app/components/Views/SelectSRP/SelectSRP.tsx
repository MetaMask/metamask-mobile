import React from 'react';
import SRPList from '../../UI/SRPList';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

const SelectSRP = () => {
  const navigation = useNavigation();

  const onKeyringSelect = (keyringId: string) => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
      keyringId,
    });
  };

  return <SRPList onKeyringSelect={onKeyringSelect} />;
};

export default SelectSRP;
