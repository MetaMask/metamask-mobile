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

  useEffect(() => {
    Engine.context.MessageManager.hub.on(
      'unapprovedMessage',
      (messageParams: MessageParams) => {
        onUnapprovedMessage(messageParams, MessageType.ETH);
      },
    );

    Engine.context.PersonalMessageManager.hub.on(
      'unapprovedMessage',
      (messageParams: MessageParams) => {
        onUnapprovedMessage(messageParams, MessageType.Personal);
      },
    );

    Engine.context.TypedMessageManager.hub.on(
      'unapprovedMessage',
      (messageParams: MessageParams) => {
        onUnapprovedMessage(messageParams, MessageType.Typed);
      },
    );

    return function cleanup() {
      Engine.context.PersonalMessageManager.hub.removeAllListeners();
      Engine.context.TypedMessageManager.hub.removeAllListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!signMessageParams || !currentPageMeta) {
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
