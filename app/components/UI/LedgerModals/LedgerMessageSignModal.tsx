import React, { useCallback, useEffect, useRef } from 'react';
import LedgerConfirmationModal from './LedgerConfirmationModal';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import { createStyles } from './styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSignModal } from '../../../actions/modals';
import { RootState } from '../../../reducers';

import { RPCStageTypes, iEventGroup } from '../../../reducers/rpcEvents';
import { resetEventStage } from '../../../actions/rpcEvents';
import {
  useHardwareWalletError,
  HardwareWalletType,
} from '../../../core/HardwareWallet';

export interface LedgerMessageSignModalParams {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageParams: any;
  onConfirmationComplete: (
    confirmed: boolean,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawSignature?: any,
  ) => Promise<void>;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  version: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deviceId: any;
}

export const createLedgerMessageSignModalNavDetails =
  createNavigationDetails<LedgerMessageSignModalParams>(
    Routes.LEDGER_MESSAGE_SIGN_MODAL,
  );

const LedgerMessageSignModal = () => {
  const dispatch = useDispatch();
  const modalRef = useRef<ReusableModalRef | null>(null);
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);
  const { signingEvent }: iEventGroup = useSelector(
    (state: RootState) => state.rpcEvents,
  );
  const { parseAndShowError } = useHardwareWalletError();

  const { onConfirmationComplete, deviceId } =
    useParams<LedgerMessageSignModalParams>();

  const dismissModal = useCallback(() => {
    modalRef?.current?.dismissModal();
    dispatch(resetEventStage(signingEvent.rpcName));
  }, [dispatch, signingEvent.rpcName]);

  useEffect(() => {
    dispatch(toggleSignModal(false));
    return () => {
      dispatch(toggleSignModal(true));
    };
  }, [dispatch]);

  useEffect(() => {
    // Close the modal when the signMessageStage is complete
    if (signingEvent.eventStage === RPCStageTypes.COMPLETE) {
      dismissModal();
    }
    // On error, show the error in the bottom sheet before closing
    if (signingEvent.eventStage === RPCStageTypes.ERROR) {
      if (signingEvent.error) {
        parseAndShowError(signingEvent.error, HardwareWalletType.Ledger);
      }
      dismissModal();
    }
  }, [
    signingEvent.eventStage,
    signingEvent.error,
    dismissModal,
    parseAndShowError,
  ]);

  const executeOnLedger = useCallback(async () => {
    try {
      await onConfirmationComplete(true);
    } catch (err) {
      // Show error in centralized bottom sheet
      parseAndShowError(err, HardwareWalletType.Ledger);
    }
  }, [onConfirmationComplete, parseAndShowError]);

  const onRejection = useCallback(() => {
    onConfirmationComplete(false);
    dismissModal();
  }, [dismissModal, onConfirmationComplete]);

  return (
    <ReusableModal ref={modalRef} style={styles.modal}>
      <View style={styles.contentWrapper}>
        <LedgerConfirmationModal
          onConfirmation={executeOnLedger}
          onRejection={onRejection}
          deviceId={deviceId}
        />
      </View>
    </ReusableModal>
  );
};

export default React.memo(LedgerMessageSignModal);
