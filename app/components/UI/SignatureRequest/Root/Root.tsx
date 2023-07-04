import Modal from 'react-native-modal';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../util/theme';
import MessageSign from '../../../UI/MessageSign';
import PersonalSign from '../../../UI/PersonalSign';
import TypedSign from '../../../UI/TypedSign';
import { MessageParams } from '../types';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';

interface RootProps {
  messageParams?: MessageParams;
  approvalType?: string;
  onSign: () => void;
}

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

const Root = ({ messageParams, approvalType, onSign }: RootProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [showExpandedMessage, setShowExpandedMessage] = useState(false);

  const toggleExpandedMessage = () =>
    setShowExpandedMessage(!showExpandedMessage);

  const currentPageMeta = messageParams?.meta;

  if (!messageParams || !currentPageMeta || !approvalType) {
    return null;
  }

  return (
    <Modal
      isVisible
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={onSign}
      onBackButtonPress={showExpandedMessage ? toggleExpandedMessage : onSign}
      onSwipeComplete={onSign}
      swipeDirection={'down'}
      propagateSwipe
    >
      {approvalType === ApprovalTypes.PERSONAL_SIGN && (
        <PersonalSign
          messageParams={messageParams}
          onCancel={onSign}
          onConfirm={onSign}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
      {approvalType === ApprovalTypes.ETH_SIGN_TYPED_DATA && (
        <TypedSign
          navigation={navigation}
          messageParams={messageParams}
          onCancel={onSign}
          onConfirm={onSign}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
      {approvalType === ApprovalTypes.ETH_SIGN && (
        <MessageSign
          navigation={navigation}
          messageParams={messageParams}
          onCancel={onSign}
          onConfirm={onSign}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
    </Modal>
  );
};

export default Root;
