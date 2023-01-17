import React, { useRef } from 'react';
import { View } from 'react-native';
import ReusableModal, {
  ReusableModalRef,
} from '../../../../components/UI/ReusableModal';
import { useStyles } from '../../../hooks/useStyles';
import stylesheet from './styles';

const QuizInfoModal = () => {
  const modalRef = useRef<ReusableModalRef>(null);
  const { styles } = useStyles(stylesheet, {});

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={styles.modal}>
        <View style={styles.bodyContainer} />
      </View>
    </ReusableModal>
  );
};

export default QuizInfoModal;
