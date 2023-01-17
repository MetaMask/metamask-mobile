import React, { useRef } from 'react';
import { View } from 'react-native';
import ReusableModal, {
  ReusableModalRef,
} from '../../../../components/UI/ReusableModal';

const QuizQuestionModal = () => {
  const modalRef = useRef<ReusableModalRef>(null);

  return (
    <ReusableModal ref={modalRef}>
      <View />
    </ReusableModal>
  );
};

export default QuizQuestionModal;
