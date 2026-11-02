import React, { useCallback, useRef } from 'react';
import { Modal, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import {
  BottomSheet,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ModalSafeAreaProvider from '../../../component-library/components-temp/ModalSafeAreaProvider';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ConfirmMembershipContent } from './components/ConfirmMembershipContent';
import { ConfirmMembershipRequestData } from './ConfirmMembershipApproval.types';

const ConfirmMembershipApproval = () => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      onConfirm();
    });
  }, [onConfirm]);

  if (approvalRequest?.type !== ApprovalTypes.CONFIRM_MEMBERSHIP) {
    return null;
  }

  const { monthlyAmount, totalAmount, renewDate, isTrial, billedOn } =
    (approvalRequest.requestData ??
      {}) as Partial<ConfirmMembershipRequestData>;

  const sheet = (
    <ModalSafeAreaProvider>
      <GestureHandlerRootView style={tw.style('flex-1')}>
        <BottomSheet
          ref={sheetRef}
          onClose={(hasPendingAction) => {
            // `hasPendingAction` is true when the sheet is closing because
            // `onCloseBottomSheet` was called with a callback (i.e. the confirm
            // path above) — `onClose` still fires in that case, so this guard
            // keeps a confirm from also triggering a reject for the same request.
            if (!hasPendingAction) {
              onReject();
            }
          }}
        >
          <ConfirmMembershipContent
            monthlyAmount={monthlyAmount ?? '0'}
            totalAmount={totalAmount ?? '0'}
            renewDate={renewDate ?? ''}
            isTrial={isTrial ?? false}
            billedOn={billedOn ?? ''}
            onClose={handleClose}
            onConfirm={handleConfirm}
          />
        </BottomSheet>
      </GestureHandlerRootView>
    </ModalSafeAreaProvider>
  );

  // RootRPCMethodsUI lives inside the Main screen, so any screen pushed above
  // Main (e.g. ProSubscription) would cover an in-tree sheet. iOS renders in a
  // separate UIWindow; mount it only while the approval is pending so an idle
  // overlay does not hide the app accessibility tree (#32973). Android
  // FullWindowOverlay is a plain View, so use a transparent Modal instead.
  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{sheet}</FullWindowOverlay>;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      {sheet}
    </Modal>
  );
};

export default ConfirmMembershipApproval;
