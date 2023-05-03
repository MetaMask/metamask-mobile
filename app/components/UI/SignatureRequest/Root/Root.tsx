import Modal from 'react-native-modal';
import React, { useEffect, useState } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Engine from '../../../../core/Engine';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { useTheme } from '../../../../util/theme';

import MessageSign from '../../../UI/MessageSign';
import PersonalSign from '../../../UI/PersonalSign';
import TypedSign from '../../../UI/TypedSign';

import { MessageInfo, MessageParams, PageMeta } from '../types';

enum MessageType {
  ETH = 'eth',
  Personal = 'personal',
  Typed = 'typed',
}

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

const Root = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [currentPageMeta, setCurrentPageMeta] = useState<PageMeta>();
  const [pendingApproval, setPendingApproval] = useState<MessageInfo>();
  const [showExpandedMessage, setShowExpandedMessage] = useState(false);
  const [signMessageParams, setSignMessageParams] = useState<MessageParams>();
  const [signType, setSignType] = useState<string>();

  const showPendingApprovalModal = ({ type, origin }: MessageInfo) => {
    InteractionManager.runAfterInteractions(() => {
      setPendingApproval({ type, origin });
    });
  };

  const onSignAction = () => setPendingApproval(undefined);

  const toggleExpandedMessage = () =>
    setShowExpandedMessage(!showExpandedMessage);

  const onUnapprovedMessage = (messageParams: MessageParams, type: string) => {
    setCurrentPageMeta(messageParams.meta);
    const signMsgParams = { ...messageParams };
    delete signMsgParams.meta;
    setSignMessageParams(signMsgParams);
    setSignType(type);
    showPendingApprovalModal({
      type: ApprovalTypes.SIGN_MESSAGE,
      origin: signMsgParams.origin,
    });
  };

  useEffect(() => {
    Engine.context.SignatureController.hub.on(
      'unapprovedMessage',
      (messageParams: MessageParams) =>
        onUnapprovedMessage(messageParams, MessageType.ETH),
    );

    Engine.context.SignatureController.hub.on(
      'unapprovedPersonalMessage',
      (messageParams: MessageParams) =>
        onUnapprovedMessage(messageParams, MessageType.Personal),
    );

    Engine.context.SignatureController.hub.on(
      'unapprovedTypedMessage',
      (messageParams: MessageParams) =>
        onUnapprovedMessage(messageParams, MessageType.Typed),
    );

    return function cleanup() {
      Engine.context.SignatureController.hub.removeAllListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!signMessageParams || !currentPageMeta) {
    return null;
  }

  return (
    <Modal
      isVisible={pendingApproval?.type === ApprovalTypes.SIGN_MESSAGE}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={onSignAction}
      onBackButtonPress={
        showExpandedMessage ? toggleExpandedMessage : onSignAction
      }
      onSwipeComplete={onSignAction}
      swipeDirection={'down'}
      propagateSwipe
    >
      {signType === MessageType.Personal && (
        <PersonalSign
          messageParams={signMessageParams}
          onCancel={onSignAction}
          onConfirm={onSignAction}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
      {signType === MessageType.Typed && (
        <TypedSign
          navigation={navigation}
          messageParams={signMessageParams}
          onCancel={onSignAction}
          onConfirm={onSignAction}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
      {signType === MessageType.ETH && (
        <MessageSign
          navigation={navigation}
          messageParams={signMessageParams}
          onCancel={onSignAction}
          onConfirm={onSignAction}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
    </Modal>
  );
};

export default Root;
