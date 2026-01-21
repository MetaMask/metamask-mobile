import { useEffect } from 'react';
import setSignatureRequestSecurityAlertResponse from '../../../../../../../actions/signatureRequest';
import { store } from '../../../../../../../store';
import { MessageParams } from '../types';

interface RootProps {
  messageParams?: MessageParams;
  approvalType?: string;
  onSignConfirm: () => void;
  onSignReject: () => void;
}

const Root = ({
  messageParams: _messageParams,
  approvalType: _approvalType,
  onSignConfirm: _onSignConfirm,
  onSignReject: _onSignReject,
}: RootProps) => {
  useEffect(() => {
    store.dispatch(setSignatureRequestSecurityAlertResponse());
    return () => {
      store.dispatch(setSignatureRequestSecurityAlertResponse());
    };
  }, []);

  return null;
};

export default Root;
