import Modal from 'react-native-modal';
import React, { useEffect, useState } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Engine from '../../../../core/Engine';

import { useTheme } from '../../../../util/theme';

import MessageSign from '../../../UI/MessageSign';
import PersonalSign from '../../../UI/PersonalSign';
import TypedSign from '../../../UI/TypedSign';

import { MessageInfo, MessageParams, PageMeta } from '../types';
import { ApprovalType } from '@metamask/controller-utils';

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
      type,
      origin: signMsgParams.origin,
    });
  };

  useEffect(() => {
    Engine.context.MessageManager.hub.on(
      'unapprovedMessage',
      (messageParams: MessageParams) => {
        onUnapprovedMessage(messageParams, ApprovalType.EthSign);
      },
    );

    Engine.context.PersonalMessageManager.hub.on(
      'unapprovedMessage',
      (messageParams: MessageParams) => {
        onUnapprovedMessage(messageParams, ApprovalType.PersonalSign);
      },
    );

    Engine.context.TypedMessageManager.hub.on(
      'unapprovedMessage',
      (messageParams: MessageParams) => {
        onUnapprovedMessage(messageParams, ApprovalType.EthSignTypedData);
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
  const isSigningApprovalType = (type?: string) =>
    type === ApprovalType.PersonalSign ||
    type === ApprovalType.EthSign ||
    type === ApprovalType.EthSignTypedData;

  return (
    <Modal
      isVisible={isSigningApprovalType(pendingApproval?.type)}
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
      {signType === ApprovalType.PersonalSign && (
        <PersonalSign
          messageParams={signMessageParams}
          onCancel={onSignAction}
          onConfirm={onSignAction}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
      {signType === ApprovalType.EthSignTypedData && (
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
      {signType === ApprovalType.EthSign && (
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
