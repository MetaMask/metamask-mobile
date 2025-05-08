import Modal from 'react-native-modal';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import setSignatureRequestSecurityAlertResponse from '../../../../../../../actions/signatureRequest';
import { store } from '../../../../../../../store';
import { useTheme } from '../../../../../../../util/theme';
import { useConfirmationRedesignEnabled } from '../../../../hooks/useConfirmationRedesignEnabled';
import PersonalSign from '../../PersonalSign';
import TypedSign from '../../TypedSign';
import { MessageParams } from '../types';
import { ApprovalTypes } from '../../../../../../../core/RPCMethods/RPCMethodMiddleware';

interface RootProps {
  messageParams?: MessageParams;
  approvalType?: string;
  onSignConfirm: () => void;
  onSignReject: () => void;
}

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

const Root = ({
  messageParams,
  approvalType,
  onSignConfirm,
  onSignReject,
}: RootProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [showExpandedMessage, setShowExpandedMessage] = useState(false);
  const visibility = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reduxState: any) => reduxState.modals.signMessageModalVisible,
  );
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();

  const toggleExpandedMessage = () =>
    setShowExpandedMessage(!showExpandedMessage);

  const currentPageMeta = messageParams?.meta;

  useEffect(() => {
    store.dispatch(setSignatureRequestSecurityAlertResponse());
    return () => {
      store.dispatch(setSignatureRequestSecurityAlertResponse());
    };
  }, []);

  if (
    !messageParams ||
    !currentPageMeta ||
    !approvalType ||
    !visibility ||
    isRedesignedEnabled
  ) {
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
      onBackButtonPress={
        showExpandedMessage ? toggleExpandedMessage : onSignReject
      }
      onSwipeComplete={onSignReject}
      swipeDirection={'down'}
      propagateSwipe
    >
      {approvalType === ApprovalTypes.PERSONAL_SIGN && (
        <PersonalSign
          messageParams={messageParams}
          onReject={onSignReject}
          onConfirm={onSignConfirm}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
      {approvalType === ApprovalTypes.ETH_SIGN_TYPED_DATA && (
        <TypedSign
          navigation={navigation}
          messageParams={messageParams}
          onReject={onSignReject}
          onConfirm={onSignConfirm}
          currentPageInformation={currentPageMeta}
          toggleExpandedMessage={toggleExpandedMessage}
          showExpandedMessage={showExpandedMessage}
        />
      )}
    </Modal>
  );
};

export default Root;
