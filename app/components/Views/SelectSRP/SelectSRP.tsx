import React, { useRef } from 'react';
import SRPList from '../../UI/SRPList';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './styles';
import Logger from '../../../util/Logger';

const SelectSRP = () => {
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const onKeyringSelect = (keyringId: string) => {
    Logger.log('Keyring selected', keyringId);
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
      keyringId,
    });
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <SRPList onKeyringSelect={onKeyringSelect} />
    </ReusableModal>
  );
};

export default SelectSRP;
