import React, { useRef } from 'react';
import { View } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
import ReusableModal, { ReusableModalRef } from '../../../UI/ReusableModal';
import Button, { ButtonSize, ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../hooks/useStyles';

import { QuizInformation } from '../QuizInformation';
import stylesheet from './styles';

const QuizModal = () => {
  const modalRef = useRef<ReusableModalRef>(null);
  const { styles } = useStyles(stylesheet, {});
  // const navigation = useNavigation();

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={styles.modal}>
        <QuizInformation styles={styles.bodyContainer} />
      </View>
    </ReusableModal>
  );
};

export default QuizModal;
