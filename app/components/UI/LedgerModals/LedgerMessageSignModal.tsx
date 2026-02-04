import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import LedgerConfirmationModal from './LedgerConfirmationModal';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../reducers';

import { RPCStageTypes, iEventGroup } from '../../../reducers/rpcEvents';
import { resetEventStage } from '../../../actions/rpcEvents';

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
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { signingEvent }: iEventGroup = useSelector(
    (state: RootState) => state.rpcEvents,
  );

  const { onConfirmationComplete, deviceId } =
    useParams<LedgerMessageSignModalParams>();

  const goBack = useCallback(() => {
    dispatch(resetEventStage(signingEvent.rpcName));
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [dispatch, signingEvent.rpcName, navigation]);

  useEffect(() => {
    // Close when the signing is complete or has errored
    if (
      signingEvent.eventStage === RPCStageTypes.COMPLETE ||
      signingEvent.eventStage === RPCStageTypes.ERROR
    ) {
      goBack();
    }
  }, [signingEvent.eventStage, goBack]);

  const executeOnLedger = useCallback(async () => {
    await onConfirmationComplete(true);
  }, [onConfirmationComplete]);

  const onRejection = useCallback(async () => {
    await onConfirmationComplete(false);
    goBack();
  }, [onConfirmationComplete, goBack]);

  return (
    <LedgerConfirmationModal
      onConfirmation={executeOnLedger}
      onRejection={onRejection}
      deviceId={deviceId}
      operationType="message"
    />
  );
};

export default React.memo(LedgerMessageSignModal);
