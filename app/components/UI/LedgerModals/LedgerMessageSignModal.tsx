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

export interface LedgerMessageSignModalParams {
  messageParams: any;
  onConfirmationComplete: (confirmed: boolean, rawSignature?: any) => void;
  version: any;
  type: any;
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
    //Close the modal when the signMessageStage is complete or error, error will return the error message to the user
    if (
      signingEvent.eventStage === RPCStageTypes.COMPLETE ||
      signingEvent.eventStage === RPCStageTypes.ERROR
    ) {
      dismissModal();
    }
  }, [signingEvent.eventStage, dismissModal]);

  const executeOnLedger = useCallback(async () => {
    onConfirmationComplete(true);
  }, [onConfirmationComplete]);

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
